import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { PlayerStage } from "@/components/PlayerStage";
import { LiveTicker } from "@/components/LiveTicker";
import { useAuctionEvents, useAuctionState, usePlayers, useRealtimeAuction, useAmbassadors } from "@/lib/auction";
import { setCasterCam } from "@/lib/accounts.functions";
import { startCasterBroadcast, type CamStatus } from "@/lib/caster-cam";
import { money, statusLabel } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/caster")({
  head: () => ({
    meta: [
      { title: "Caster Console — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role={["caster", "admin"]}>
      <CasterConsole />
    </RoleGate>
  ),
});

export export function CasterConsole() {
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: events = [] } = useAuctionEvents();
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Caster Console</h1>
        <div className="flex items-center gap-2">
          <span className="label-cond border border-line bg-panel px-3 py-1 text-[12px] text-mut">
            {statusLabel(state?.status)}
          </span>
          <Link to="/broadcast" className="label-cond border border-gold/50 px-3 py-1 text-[12px] text-gold">
            Open Broadcast View ↗
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <PlayerStage player={current} state={state} />
          <AuctionControls />
          <LiveTicker events={events} />
        </div>
        <div className="flex flex-col gap-4">
          <CasterCamCard />
          <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">On The Block</div>
            <div className="mt-1 font-display text-3xl">{current?.ingame_name ?? "—"}</div>
            <div className="mt-1 font-mono text-[11px] text-mut">
              {state?.current_bid
                ? `${leader?.team_name ?? "?"} · ${money(state.current_bid)}`
                : current
                  ? `Base ${money(state?.base_price ?? 0)} — no bids yet`
                  : "No player selected"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

type RpcResult = { completed?: boolean; result?: string } | null;

function AuctionControls() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const state = useAuctionState().data;
  const status = state?.status;
  const hasCurrent = !!state?.current_player_id;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["auction_state"] });
    await qc.invalidateQueries({ queryKey: ["players"] });
    await qc.invalidateQueries({ queryKey: ["ambassadors"] });
    await qc.invalidateQueries({ queryKey: ["auction_events"] });
    await qc.invalidateQueries({ queryKey: ["bids"] });
  };

  const rpc = async (key: string, invoke: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>) => {
    setBusy(key);
    try {
      const { error, data } = (await invoke()) as { error: { message: string } | null; data: RpcResult };
      if (error) throw error;
      const res = data as RpcResult;
      if (res?.completed) toast.info("Pool is empty — auction completed");
      else if (res?.result === "sold") toast.success("SOLD! Points deducted and roster assigned");
      else if (res?.result === "unsold") toast.info("No bids — marked UNSOLD");
      else toast.success("Done");
      await refresh();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      toast.error(name === "NotAllowedError" ? "CAMERA PERMISSION REQUIRED" : name === "NotFoundError" ? "CAMERA UNAVAILABLE" : errText(err));
    } finally {
      setBusy(null);
    }
  };

  const disabled = (k: string) => busy !== null && busy !== k;

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Auction Controls</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {status === "not_started" && (
          <button
            disabled={disabled("start")}
            onClick={() => void rpc("start", () => supabase.rpc("caster_set_status", { p_status: "live" }))}
            className="label-cond bg-sold px-4 py-2 text-[13px] text-arena disabled:opacity-40"
          >
            ▶ Start Auction
          </button>
        )}
        {status === "live" && (
          <button
            disabled={disabled("pause")}
            onClick={() => void rpc("pause", () => supabase.rpc("caster_set_status", { p_status: "paused" }))}
            className="label-cond border border-line bg-panel2 px-4 py-2 text-[13px] text-mut hover:text-foreground disabled:opacity-40"
          >
            ⏸ Pause
          </button>
        )}
        {status === "paused" && (
          <button
            disabled={disabled("resume")}
            onClick={() => void rpc("resume", () => supabase.rpc("caster_set_status", { p_status: "live" }))}
            className="label-cond bg-sold px-4 py-2 text-[13px] text-arena disabled:opacity-40"
          >
            ▶ Resume
          </button>
        )}
        {(status === "live" || status === "paused") && (
          <button
            disabled={disabled("stop")}
            onClick={() => {
              if (confirm("Stop the auction? Bidding closes for everyone.")) void rpc("stop", () => supabase.rpc("caster_set_status", { p_status: "stopped" }));
            }}
            className="label-cond border border-alert/50 bg-alert/10 px-4 py-2 text-[13px] text-alert disabled:opacity-40"
          >
            ⏹ Stop
          </button>
        )}

        <span className="mx-1 w-px bg-line" />

        <button
          disabled={disabled("next") || status !== "live" || hasCurrent}
          onClick={() => void rpc("next", () => supabase.rpc("caster_next_player"))}
          className="label-cond border border-gold/50 bg-gold/10 px-4 py-2 text-[13px] text-gold disabled:opacity-40"
          title={status !== "live" ? "Start the auction first" : hasCurrent ? "Finalize the current player first" : "Pick the next player from the pool"}
        >
          ⏭ Next Player
        </button>
        <button
          disabled={disabled("final") || !hasCurrent || status !== "live"}
          onClick={() => void rpc("final", () => supabase.rpc("finalize_player_v3"))}
          className="label-cond bg-gold px-5 py-2 text-[14px] text-arena disabled:opacity-40"
          title="Sell to the highest bidder (or mark UNSOLD if no bids)"
        >
          🔨 SOLD
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-mut">
        SOLD assigns the player to the highest bidder, deducts their points atomically and locks the result.
        No bids → the player goes UNSOLD automatically.
      </p>
    </div>
  );
}

function CasterCamCard() {
  const qc = useQueryClient();
  const setCaster = useServerFn(setCasterCam);
  const flagLive = useAuctionState().data?.caster_cam_live ?? false;
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoId, setVideoId] = useState("default");
  const [audioId, setAudioId] = useState("default");
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");
  const [viewers, setViewers] = useState(0);
  const [live, setLive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const stopRef = useRef<null | (() => void)>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "videoinput" || d.kind === "audioinput")))
      .catch(() => {});
    return () => {
      stopRef.current?.();
      preview?.getTracks().forEach((track) => track.stop());
      void setCaster({ data: { live: false } }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (previewRef.current && preview) {
      previewRef.current.srcObject = preview;
      void previewRef.current.play().catch(() => {});
    }
  }, [preview]);

  const startCamera = async () => {
    if (preview) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoId === "default" ? true : { deviceId: { exact: videoId } },
        audio: audioId === "default" ? true : { deviceId: { exact: audioId } },
      });
      setPreview(stream);
      setStatus("idle");
      setMicMuted(false);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setStatus("error");
      toast.error(name === "NotAllowedError" ? "CAMERA PERMISSION REQUIRED" : name === "NotFoundError" ? "CAMERA UNAVAILABLE" : errText(err));
    }
  };

  const startLive = async () => {
    if (!preview || live) return;
    try {
      stopRef.current = startCasterBroadcast(preview, (next, count) => {
        setStatus(next);
        if (count !== undefined) setViewers(count);
        if (next === "error") {
          setLive(false);
          void setCaster({ data: { live: false } }).catch(() => {});
        }
      });
      await setCaster({ data: { live: true } });
      setLive(true);
      toast.success("Caster cam is live — audience can see and hear you");
      await qc.invalidateQueries({ queryKey: ["auction_state"] });
    } catch (err) {
      stopRef.current?.();
      stopRef.current = null;
      setStatus("error");
      toast.error(errText(err));
    }
  };

  const stopLive = async () => {
    stopRef.current?.();
    stopRef.current = null;
    setLive(false);
    setViewers(0);
    setStatus(preview ? "idle" : "ended");
    await setCaster({ data: { live: false } }).catch(() => {});
    await qc.invalidateQueries({ queryKey: ["auction_state"] });
  };

  const stopCamera = async () => {
    await stopLive();
    preview?.getTracks().forEach((track) => track.stop());
    setPreview(null);
    setMicMuted(false);
    setStatus("idle");
    toast.info("Camera stopped");
  };

  const toggleMic = () => {
    if (!preview) return;
    const nextMuted = !micMuted;
    preview.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMicMuted(nextMuted);
  };

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div className="label-cond text-[12px] text-mut">Caster Cam — WebRTC</div>
        {(live || flagLive) && (
          <span className="label-cond flex items-center gap-1.5 bg-alert px-2 py-0.5 text-[10px] text-white">
            <i className="live-dot size-1.5 rounded-full bg-white" /> LIVE · {viewers} viewers
          </span>
        )}
      </div>
      <div className="mt-3 aspect-video min-h-[220px] overflow-hidden rounded-lg bg-black">
        {preview ? (
          <video ref={previewRef} muted playsInline autoPlay className="size-full object-cover" />
        ) : (
          <div className="label-cond grid size-full place-items-center text-[12px] text-mut">
            {status === "error" ? "CAMERA UNAVAILABLE" : "YOUR CAMERA"}
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2">
        <select className="field" value={videoId} onChange={(e) => setVideoId(e.target.value)} disabled={!!preview}>
          <option value="default">Default camera</option>
          {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera"}</option>)}
        </select>
        <select className="field" value={audioId} onChange={(e) => setAudioId(e.target.value)} disabled={!!preview}>
          <option value="default">Default microphone</option>
          {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {!preview ? (
            <button onClick={() => void startCamera()} className="label-cond bg-panel2 py-2 text-[13px] ring-1 ring-line">
              Start Camera
            </button>
          ) : (
            <button onClick={() => void stopCamera()} className="label-cond border border-alert/50 bg-alert/10 py-2 text-[13px] text-alert">
              Stop Camera
            </button>
          )}
          <button disabled={!preview} onClick={toggleMic} className="label-cond border border-line bg-panel2 py-2 text-[13px] disabled:opacity-40">
            {micMuted ? "Unmute Microphone" : "Mute Microphone"}
          </button>
        </div>
        {preview && !live ? (
          <button onClick={() => void startLive()} className="label-cond bg-alert py-2 text-[13px] text-white">
            🔴 Start Live
          </button>
        ) : (
          <button disabled={!live} onClick={() => void stopLive()} className="label-cond border border-alert/50 bg-alert/10 py-2 text-[13px] text-alert disabled:opacity-40">
            ⏹ Stop Live
          </button>
        )}
        <p className="font-mono text-[11px] text-mut">
          Status: {live ? status : preview ? "camera ready" : status} · {viewers} viewers · camera/audio stay peer-to-peer.
        </p>
      </div>
    </div>
  );
}