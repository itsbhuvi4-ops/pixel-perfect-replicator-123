import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

const newId = () => crypto.randomUUID();
async function send(channel: RealtimeChannel | null, payload: Signal) {
  if (channel) await channel.send({ type: "broadcast", event: "signal", payload });
}
function addressedTo(payload: Signal, id: string) {
  return "to" in payload ? payload.to === id : payload.kind === "bye";
}

export function startCasterBroadcast(
  stream: MediaStream,
  onStatus: (status: CamStatus, viewers?: number) => void,
): () => void {
  const id = newId();
  const peers = new Map<string, RTCPeerConnection>();
  let channel: RealtimeChannel | null = null;
  let stopped = false;

  const report = () => onStatus("live", peers.size);
  const drop = (viewer: string) => {
    const pc = peers.get(viewer);
    pc?.close();
    peers.delete(viewer);
    report();
  };

  const connect = async (viewer: string) => {
    if (stopped || !channel || peers.has(viewer)) return;
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peers.set(viewer, pc);
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = (event) => {
      if (event.candidate && channel) {
        void send(channel, {
          kind: "ice",
          from: id,
          to: viewer,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") report();
      if (["failed", "closed"].includes(pc.connectionState)) drop(viewer);
      if (pc.connectionState === "disconnected") {
        window.setTimeout(() => {
          if (pc.connectionState === "disconnected") drop(viewer);
        }, 5000);
      }
    };
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.localDescription?.sdp) {
        await send(channel, { kind: "offer", from: id, to: viewer, sdp: pc.localDescription.sdp });
      }
      report();
    } catch {
      drop(viewer);
    }
  };

  onStatus("connecting");
  channel = supabase
    .channel(CAM_CHANNEL, { config: { broadcast: { self: false }, presence: { key: id } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped) return;
      if (payload.kind === "hello") {
        await connect(payload.from);
        return;
      }
      if (!addressedTo(payload, id)) return;
      if (payload.kind === "answer") {
        const pc = peers.get(payload.from);
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp }).catch(() => {});
        }
      } else if (payload.kind === "ice") {
        const pc = peers.get(payload.from);
        if (pc?.remoteDescription) await pc.addIceCandidate(payload.candidate).catch(() => {});
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onStatus("live", peers.size);
        void channel?.track({ role: "caster" });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  return () => {
    stopped = true;
    peers.forEach((pc) => pc.close());
    peers.clear();
    if (channel) void send(channel, { kind: "bye", from: id });
    if (channel) void supabase.removeChannel(channel);
    onStatus("idle", 0);
  };
}

export function watchCasterCam(
  onStream: (stream: MediaStream | null) => void,
  onStatus: (status: CamStatus) => void,
): () => void {
  const id = newId();
  let channel: RealtimeChannel | null = null;
  let pc: RTCPeerConnection | null = null;
  let helloTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const pendingIce: RTCIceCandidateInit[] = [];

  const clearRetry = () => {
    if (helloTimer) clearTimeout(helloTimer);
    helloTimer = null;
  };
  const teardown = () => {
    pc?.close();
    pc = null;
    pendingIce.length = 0;
  };
  const ask = () => {
    if (stopped || !channel) return;
    void send(channel, { kind: "hello", from: id });
    clearRetry();
    helloTimer = setTimeout(ask, 5000);
  };

  onStatus("connecting");
  channel = supabase
    .channel(CAM_CHANNEL, { config: { broadcast: { self: false }, presence: { key: id } } })
    .on("broadcast", { event: "signal" }, async ({ payload }: { payload: Signal }) => {
      if (stopped) return;
      if (payload.kind === "bye") {
        teardown();
        onStream(null);
        onStatus("ended");
        setTimeout(() => { if (!stopped) { onStatus("connecting"); ask(); } }, 500);
        return;
      }
      if (!addressedTo(payload, id)) return;

      if (payload.kind === "offer") {
        teardown();
        const current = new RTCPeerConnection(ICE_CONFIG);
        pc = current;
        current.ontrack = (event) => {
          const stream = event.streams[0];
          if (stream) onStream(stream);
        };
        current.onicecandidate = (event) => {
          if (event.candidate && channel) {
            void send(channel, {
              kind: "ice",
              from: id,
              to: payload.from,
              candidate: event.candidate.toJSON(),
            });
          }
        };
        current.onconnectionstatechange = () => {
          if (current.connectionState === "connected") {
            clearRetry();
            onStatus("live");
          } else if (["failed", "closed"].includes(current.connectionState)) {
            onStream(null);
            onStatus("connecting");
            ask();
          } else if (current.connectionState === "disconnected") {
            onStatus("connecting");
            setTimeout(() => {
              if (!stopped && current.connectionState === "disconnected") {
                teardown();
                onStream(null);
                ask();
              }
            }, 5000);
          }
        };

        try {
          await current.setRemoteDescription({ type: "offer", sdp: payload.sdp });
          for (const candidate of pendingIce.splice(0)) {
            await current.addIceCandidate(candidate).catch(() => {});
          }
          const answer = await current.createAnswer();
          await current.setLocalDescription(answer);
          if (current.localDescription?.sdp) {
            await send(channel, { kind: "answer", from: id, to: payload.from, sdp: current.localDescription.sdp });
          }
        } catch {
          onStream(null);
          onStatus("error");
        }
      } else if (payload.kind === "ice") {
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(payload.candidate).catch(() => {});
        } else {
          pendingIce.push(payload.candidate);
        }
      }
    })
    .subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        void channel?.track({ role: "viewer" });
        ask();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onStatus("error");
      }
    });

  return () => {
    stopped = true;
    clearRetry();
    teardown();
    if (channel) void supabase.removeChannel(channel);
    onStream(null);
    onStatus("idle");
  };
}

export function attachStream(el: HTMLVideoElement | null, stream: MediaStream | null) {
  if (!el) return;
  if (el.srcObject !== stream) el.srcObject = stream;
  if (stream) void el.play().catch(() => {});
}
