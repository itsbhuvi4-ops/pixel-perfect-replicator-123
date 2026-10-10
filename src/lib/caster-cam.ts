import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getWebRtcIceServers } from "@/lib/accounts.functions";

export const CAM_CHANNEL_PREFIX = "bidx-caster-cam:";

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

let iceConfigPromise: Promise<RTCConfiguration> | null = null;
async function getIceConfig(): Promise<RTCConfiguration> {
  if (!iceConfigPromise) {
    iceConfigPromise = getWebRtcIceServers().then((result) => result as RTCConfiguration).catch(() => DEFAULT_ICE);
  }
  return iceConfigPromise;
}

export type CamStatus = "idle" | "connecting" | "live" | "ended" | "error";

type Signal =
  | { kind: "hello"; from: string }
  | { kind: "offer"; from: string; to: string; sdp: string }
  | { kind: "answer"; from: string; to: string; sdp: string }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string; to?: string };

const id = () => crypto.randomUUID();

async function send(channel: RealtimeChannel | null, payload: Signal) {
  if (channel) await channel.send({ type: "broadcast", event: "signal", payload });
}

function targeted(payload: Signal, receiver: string) {
  return !("to" in payload) || !payload.to || payload.to === receiver;
}

function topic(sessionId: string) {
  return `${CAM_CHANNEL_PREFIX}${sessionId}`;
}

export async function startCasterBroadcast(
  stream: MediaStream,
  onStatus: (status: CamStatus, viewers?: number) => void,
  sessionId: string,
): Promise<() => void> {
  const iceConfig = await getIceConfig();
  const casterId = id();
  const peers = new Map<string, RTCPeerConnection>();
  const pendingIce = new Map<string, RTCIceCandidateInit[]>();
  let channel: RealtimeChannel | null = null;
  let stopped = false;

  const report = () => onStatus("live", peers.size);
  const drop = (viewerId: string) => {
    peers.get(viewerId)?.close();
    peers.delete(viewerId);
    pendingIce.delete(viewerId);
    if (!stopped) report();
  };

  const negotiate = async (viewerId: string, iceRestart = false) => {
    const pc = peers.get(viewerId);
    if (!pc || stopped || !channel) return;
    try {
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await pc.setLocalDescription(offer);
      if (channel && pc.localDescription?.sdp) {
        await send(channel, { kind: "offer", from: casterId, to: viewerId, sdp: pc.localDescription.sdp });
      }
    } catch {
      drop(viewerId);
    }
  };

  const connect = async (viewerId: string) => {
    if (stopped || !channel || peers.has(viewerId)) return;
    const pc = new RTCPeerConnection(iceConfig);
    peers.set(viewerId, pc);
    pendingIce.set(viewerId, []);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && channel) {
        void send(channel, { kind: "ice", from: casterId, to: viewerId, candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") report();
      if (pc.connectionState === "failed" || pc.connectionState === "closed") drop(viewerId);
      if (pc.connectionState === "disconnected") {
        window.setTimeout(() => {
          if (stopped || peers.get(viewerId) !== pc) return;
          if (pc.connectionState === "disconnected") {
            void negotiate(viewerId, true);
            window.setTimeout(() => {
              if (!stopped && peers.get(viewerId) === pc && pc.connectionState !== "connected") drop(viewerId);
            }, 4500);
          }
        }, 1000);
      }
    };

    await negotiate(viewerId);
  };

  onStatus("connecting");
  channel = supabase
    .channel(topic(sessionId), { config: { broadcast: { self: false }, presence: { key: casterId } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped) return;
      if (payload.kind === "hello") {
        const existing = peers.get(payload.from);
        if (existing) {
          if (existing.connectionState === "connected") return;
          // A broadcast offer can be missed during reconnects. Re-send the
          // pending offer when this viewer says hello again instead of leaving
          // the viewer stuck forever on an unconnected peer.
          if (
            existing.localDescription?.type === "offer" &&
            !existing.remoteDescription &&
            existing.signalingState !== "closed"
          ) {
            await send(channel, {
              kind: "offer",
              from: casterId,
              to: payload.from,
              sdp: existing.localDescription.sdp ?? "",
            });
            return;
          }
          if (existing.connectionState === "failed" || existing.connectionState === "closed") {
            drop(payload.from);
          } else {
            return;
          }
        }
        await connect(payload.from);
        return;
      }
      if (!targeted(payload, casterId)) return;

      if (payload.kind === "answer") {
        const pc = peers.get(payload.from);
        if (!pc || pc.signalingState === "closed") return;
        try {
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
          for (const candidate of pendingIce.get(payload.from) ?? []) await pc.addIceCandidate(candidate).catch(() => {});
          pendingIce.delete(payload.from);
        } catch {
          drop(payload.from);
        }
      } else if (payload.kind === "ice") {
        const pc = peers.get(payload.from);
        if (!pc) return;
        if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate).catch(() => {});
        else pendingIce.get(payload.from)?.push(payload.candidate);
      } else if (payload.kind === "bye") {
        drop(payload.from);
      }
    })
    .subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        report();
        void channel?.track({ role: "caster", sessionId });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  return () => {
    stopped = true;
    peers.forEach((pc) => pc.close());
    peers.clear();
    pendingIce.clear();
    if (channel) void supabase.removeChannel(channel);
    channel = null;
    onStatus("idle", 0);
  };
}

export function watchCasterCam(
  sessionId: string | null,
  onStream: (stream: MediaStream | null) => void,
  onStatus: (status: CamStatus) => void,
): () => void {
  if (!sessionId) {
    onStream(null);
    onStatus("idle");
    return () => {};
  }

  const viewerId = id();
  const iceConfigForViewer = getIceConfig();
  let channel: RealtimeChannel | null = null;
  let pc: RTCPeerConnection | null = null;
  let casterId: string | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let remoteDescriptionSet = false;
  const pendingIce: RTCIceCandidateInit[] = [];

  const cleanup = () => {
    pc?.close();
    pc = null;
    casterId = null;
    remoteDescriptionSet = false;
    pendingIce.length = 0;
  };

  const ask = () => {
    if (stopped || !channel) return;
    if (retryTimer) clearTimeout(retryTimer);
    void send(channel, { kind: "hello", from: viewerId });
    retryTimer = setTimeout(ask, 5000);
  };

  const connect = async (offer: Extract<Signal, { kind: "offer" }>) => {
    cleanup();
    casterId = offer.from;
    const iceConfig = await iceConfigForViewer;
    const next = new RTCPeerConnection(iceConfig);
    pc = next;
    const remoteStream = new MediaStream();

    next.ontrack = (event) => {
      if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) remoteStream.addTrack(event.track);
      onStream(remoteStream);
    };
    next.onicecandidate = (event) => {
      if (event.candidate && channel) {
        void send(channel, { kind: "ice", from: viewerId, to: offer.from, candidate: event.candidate.toJSON() });
      }
    };
    next.oniceconnectionstatechange = () => {
      if (next.iceConnectionState === "failed") {
        onStream(null);
        onStatus("connecting");
        cleanup();
        ask();
      }
    };
    next.onconnectionstatechange = () => {
      if (next.connectionState === "connected") {
        if (retryTimer) clearTimeout(retryTimer);
        onStatus("live");
      } else if (next.connectionState === "failed" || next.connectionState === "closed") {
        onStream(null);
        onStatus("connecting");
        cleanup();
        ask();
      } else if (next.connectionState === "disconnected") {
        onStream(null);
        onStatus("connecting");
        window.setTimeout(() => {
          if (!stopped && pc === next && next.connectionState === "disconnected") {
            next.restartIce();
            ask();
          }
        }, 1500);
      }
    };

    try {
      await next.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      remoteDescriptionSet = true;
      for (const candidate of pendingIce.splice(0)) await next.addIceCandidate(candidate).catch(() => {});
      const answer = await next.createAnswer();
      await next.setLocalDescription(answer);
      if (channel && next.localDescription?.sdp) {
        await send(channel, { kind: "answer", from: viewerId, to: offer.from, sdp: next.localDescription.sdp });
      }
    } catch {
      cleanup();
      onStream(null);
      onStatus("error");
    }
  };

  onStatus("connecting");
  channel = supabase
    .channel(topic(sessionId), { config: { broadcast: { self: false }, presence: { key: viewerId } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped || !targeted(payload, viewerId)) return;
      if (payload.kind === "offer") {
        if (payload.from === casterId && pc?.signalingState === "stable") return;
        await connect(payload);
      } else if (payload.kind === "ice") {
        if (pc && remoteDescriptionSet) await pc.addIceCandidate(payload.candidate).catch(() => {});
        else pendingIce.push(payload.candidate);
      } else if (payload.kind === "bye") {
        cleanup();
        onStream(null);
        onStatus("ended");
      }
    })
    .subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        void channel?.track({ role: "viewer", sessionId });
        ask();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (channel && casterId) void send(channel, { kind: "bye", from: viewerId, to: casterId });
    cleanup();
    if (channel) void supabase.removeChannel(channel);
    channel = null;
    onStream(null);
    onStatus("idle");
  };
}

export function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  if (stream) void el.play().catch(() => {});
}
