import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * WebRTC caster cam: the caster's camera + microphone are streamed
 * peer-to-peer to every viewer. Signaling (offers, answers, ICE) runs over a
 * Supabase Realtime broadcast channel, so no media or credentials ever touch
 * an extra server. One streamer, N viewers (mesh — fine for auction rooms).
 */

export const CAM_CHANNEL = "bidx-caster-cam";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CamStatus = "idle" | "connecting" | "live" | "ended" | "error";

type Signal =
  | { kind: "hello"; from: string }
  | { kind: "offer"; from: string; to: string; sdp: string }
  | { kind: "answer"; from: string; to: string; sdp: string }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

const me = (): string => crypto.randomUUID();

async function send(channel: RealtimeChannel | null, payload: Signal) {
  if (!channel) return;
  channel.send({ type: "broadcast", event: "signal", payload });
}

function targets(payload: Signal | undefined, id: string): boolean {
  return !!payload && "to" in payload && payload.to === id;
}

/** Caster side: publish a local MediaStream to every viewer who asks. */
export function startCasterBroadcast(
  stream: MediaStream,
  onStatus: (status: CamStatus, viewers?: number) => void,
): () => void {
  const id = me();
  const peers = new Map<string, RTCPeerConnection>();
  let channel: RealtimeChannel | null = null;
  let stopped = false;

  const viewerCount = () => onStatus("live", peers.size);

  const drop = (viewer: string) => {
    peers.get(viewer)?.close();
    peers.delete(viewer);
    viewerCount();
  };

  const connect = async (viewer: string) => {
    if (stopped || !channel) return;
    drop(viewer);
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peers.set(viewer, pc);
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = (e) => {
      if (e.candidate && channel)
        void send(channel, { kind: "ice", from: id, to: viewer, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) drop(viewer);
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    void send(channel, { kind: "offer", from: id, to: viewer, sdp: offer.sdp! });
    viewerCount();
  };

  onStatus("connecting");
  channel = supabase
    .channel(CAM_CHANNEL, { config: { broadcast: { self: false }, presence: { key: id } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped || !targets(payload, id)) return;
      if (payload.kind === "hello") await connect(payload.from);
      else if (payload.kind === "answer") {
        const pc = peers.get(payload.from);
        if (pc && pc.signalingState !== "stable")
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp }).catch(() => {});
      } else if (payload.kind === "ice") {
        const pc = peers.get(payload.from);
        if (pc) await pc.addIceCandidate(payload.candidate).catch(() => {});
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus("live", 0);
        channel?.track({ role: "caster" });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  return () => {
    stopped = true;
    if (channel) void send(channel, { kind: "bye", from: id });
    peers.forEach((pc) => pc.close());
    peers.clear();
    if (channel) void supabase.removeChannel(channel);
    onStatus("idle");
  };
}

/** Viewer side: subscribe to the live caster cam, if one is streaming. */
export function watchCasterCam(
  onStream: (stream: MediaStream | null) => void,
  onStatus: (status: CamStatus) => void,
): () => void {
  const id = me();
  let channel: RealtimeChannel | null = null;
  let pc: RTCPeerConnection | null = null;
  let helloTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const teardown = () => {
    if (pc) {
      pc.getSenders().forEach((s) => s.track?.stop?.());
      pc.close();
      pc = null;
    }
  };

  onStatus("connecting");
  channel = supabase
    .channel(CAM_CHANNEL, { config: { broadcast: { self: false }, presence: { key: id } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped || !targets(payload, id)) return;
      if (payload.kind === "offer") {
        teardown();
        pc = new RTCPeerConnection(ICE_CONFIG);
        pc.ontrack = (e) => {
          if (e.streams[0]) onStream(e.streams[0]);
        };
        pc.onicecandidate = (e) => {
          if (e.candidate && channel)
            void send(channel, { kind: "ice", from: id, to: payload.from, candidate: e.candidate.toJSON() });
        };
        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === "connected") {
            onStatus("live");
            if (helloTimer) clearTimeout(helloTimer);
          } else if (["failed", "disconnected", "closed"].includes(pc?.connectionState ?? "")) {
            onStream(null);
            onStatus("connecting");
            ask();
          }
        };
        await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        void send(channel, { kind: "answer", from: id, to: payload.from, sdp: answer.sdp! });
      } else if (payload.kind === "ice" && pc) {
        await pc.addIceCandidate(payload.candidate).catch(() => {});
      } else if (payload.kind === "bye") {
        onStream(null);
        onStatus("ended");
      }
    })
    .subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        ask();
        channel?.track({ role: "viewer" });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  // Re-ask periodically until a connection lands — the caster may appear later.
  const ask = () => {
    if (stopped || !channel) return;
    void send(channel, { kind: "hello", from: id });
    helloTimer = setTimeout(ask, 5000);
  };

  return () => {
    stopped = true;
    if (helloTimer) clearTimeout(helloTimer);
    teardown();
    if (channel) void supabase.removeChannel(channel);
    onStream(null);
    onStatus("idle");
  };
}

/** Shared hook plumbing: binds a MediaStream to a <video> element. */
export function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  if (stream) void el.play().catch(() => {});
}
