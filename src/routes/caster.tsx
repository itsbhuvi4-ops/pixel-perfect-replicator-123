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

export function CasterConsole() {
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoId, setVideoId] = useState("default");
  const [audioId, setAudioId] = useState("default");
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");
  const [viewers, setViewers] = useState(0);
  const [live, setLive] = useState(false);
  const stopRef = useRef<null | (() => void)>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "videoinput" || d.kind === "audioinput")))
      .catch(() => {});
    return () => stopRef.current?.();
  }, []);

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.srcObject = preview;
    if (preview) void previewRef.current.play().catch(() => {});
  }, [preview]);

  const startCamera = async () => {
    if (preview) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoId === "default" ? true : { deviceId: { exact: videoId } },
        audio: audioId === "default" ? true : { deviceId: { exact: audioId } },
      });
      setPreview(stream);
      setStatus("connecting");
      toast.success("Camera + microphone ready");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      toast.error(name === "NotAllowedError" ? "CAMERA PERMISSION REQUIRED" : name === "NotFoundError" ? "CAMERA UNAVAILABLE" : errText(err));
    }
  };

  const startLive = async () => {
    if (!preview) {
      await startCamera();
      return;
    }
    try {
      stopRef.current = startCasterBroadcast(preview, (nextStatus, count) => {
        setStatus(nextStatus);
        if (count !== undefined) setViewers(count);
      });
      await setCaster({ data: { live: true } });
      setLive(true);
      toast.success("● LIVE — Caster camera is broadcasting");
      await qc.invalidateQueries({ queryKey: ["auction_state"] });
    } catch (err) {
      stopRef.current?.();
      stopRef.current = null;
      toast.error(errText(err));
    }
  };

  const stopLive = async () => {
    stopRef.current?.();
    stopRef.current = null;
    if (preview) preview.getTracks().forEach((track) => track.stop());
    setPreview(null);
    setLive(false);
    setStatus("idle");
    setViewers(0);
    await setCaster({ data: { live: false } });
    await qc.invalidateQueries({ queryKey: ["auction_state"] });
  };

  const toggleMic = () => {
    const track = preview?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
  };

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");
  const micEnabled = preview?.getAudioTracks()[0]?.enabled ?? false;

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div><div className="label-cond text-[12px] text-mut">Caster Camera</div><div className="font-display text-2xl">YOUR LIVE CAMERA</div></div>
        <span className="label-cond border border-line bg-panel2 px-2 py-1 text-[10px] text-mut">{live ? "● LIVE" : status === "connecting" ? "CONNECTING..." : "OFFLINE"}</span>
      </div>
      <div className="relative mt-3 aspect-video min-h-[220px] overflow-hidden rounded-lg bg-black">
        {preview ? <video ref={previewRef} muted playsInline autoPlay controls={false} className="size-full object-cover" /> :
          <div className="label-cond grid size-full place-items-center text-[12px] text-mut">YOUR CAMERA</div>}
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
          {!preview ? <button onClick={() => void startCamera()} className="label-cond bg-panel2 py-2 text-[12px] text-foreground">Start Camera</button> :
            <button onClick={toggleMic} disabled={live} className="label-cond border border-line py-2 text-[12px] text-mut">{micEnabled ? "Mute Microphone" : "Unmute Microphone"}</button>}
          {!live ? <button onClick={() => void startLive()} disabled={!preview} className="label-cond bg-alert py-2 text-[12px] text-white disabled:opacity-40">Start Live</button> :
            <button onClick={() => void stopLive()} className="label-cond border border-alert/50 bg-alert/10 py-2 text-[12px] text-alert">Stop Live</button>}
        </div>
        {preview && !live && <button onClick={() => void stopLive()} className="label-cond border border-line py-2 text-[12px] text-mut">Stop Camera</button>}
        <p className="font-mono text-[11px] text-mut">Status: {status} · {viewers} viewer{viewers === 1 ? "" : "s"} · WebRTC peer-to-peer</p>
      </div>
    </div>
  );
}
