import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { PlayerStage } from "@/components/PlayerStage";
import { LiveTicker } from "@/components/LiveTicker";
import { useAuctionEvents, useAuctionState, usePlayers, useRealtimeAuction, useAmbassadors } from "@/lib/auction";
import { setAuctionStatus, setCasterCam } from "@/lib/accounts.functions";
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
  const setStatus = useServerFn(setAuctionStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const { data: state } = useAuctionState();
  const status = state?.status;
  const hasCurrent = !!state?.current_player_id;
  const canStart = status === "not_started" || status === "stopped";
  const isLive = status === "live";
  const isPaused = status === "paused";

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["auction_state"] }),
      qc.invalidateQueries({ queryKey: ["players"] }),
      qc.invalidateQueries({ queryKey: ["ambassadors"] }),
      qc.invalidateQueries({ queryKey: ["auction_events"] }),
      qc.invalidateQueries({ queryKey: ["bids"] }),
    ]);
  };

  const changeStatus = async (key: "start" | "pause" | "resume" | "stop", next: "live" | "paused" | "stopped") => {
    setBusy(key);
    try {
      await setStatus({ data: { status: next } });
      await refresh();
      toast.success(
        key === "start" ? "Auction started" :
        key === "pause" ? "Auction paused" :
        key === "resume" ? "Auction resumed" :
        "Auction stopped",
      );
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const runAuctionAction = async (key: "next" | "final", invoke: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>) => {
    setBusy(key);
    try {
      const { error, data } = await invoke();
      if (error) throw error;
      const result = data as RpcResult;
      if (result?.completed) toast.info("Pool is empty — auction completed");
      else if (result?.result === "sold") toast.success("SOLD! Points deducted and roster assigned");
      else if (result?.result === "unsold") toast.info("No bids — marked UNSOLD");
      else toast.success("Done");
      await refresh();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const disabled = (key: string) => busy !== null && busy !== key;

  return (
    <section className="overflow-hidden rounded-xl bg-panel ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="label-cond text-[12px] text-mut">Auction Control</div>
          <div className="mt-1 font-display text-2xl">LIVE AUCTION</div>
        </div>
        <span className={`label-cond border px-3 py-1 text-[11px] ${isLive ? "border-sold/50 text-sold" : isPaused ? "border-gold/50 text-gold" : "border-line text-mut"}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-4">
        <button
          type="button"
          disabled={disabled("start") || !canStart}
          onClick={() => void changeStatus("start", "live")}
          className="label-cond min-h-12 border border-sold/40 bg-sold/10 px-4 py-3 text-left text-[12px] text-sold transition hover:bg-sold/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="block text-lg leading-none">▶</span>
          <span className="mt-2 block">START AUCTION</span>
        </button>

        <button
          type="button"
          disabled={disabled("pause") || !isLive}
          onClick={() => void changeStatus("pause", "paused")}
          className="label-cond min-h-12 border border-line bg-panel2 px-4 py-3 text-left text-[12px] text-foreground transition hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="block text-lg leading-none">Ⅱ</span>
          <span className="mt-2 block">PAUSE AUCTION</span>
        </button>

        <button
          type="button"
          disabled={disabled("resume") || !isPaused}
          onClick={() => void changeStatus("resume", "live")}
          className="label-cond min-h-12 border border-gold/40 bg-gold/10 px-4 py-3 text-left text-[12px] text-gold transition hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="block text-lg leading-none">▶</span>
          <span className="mt-2 block">RESUME AUCTION</span>
        </button>

        <button
          type="button"
          disabled={disabled("stop") || (!isLive && !isPaused)}
          onClick={() => {
            if (confirm("Stop the auction? Bidding will close for everyone.")) {
              void changeStatus("stop", "stopped");
            }
          }}
          className="label-cond min-h-12 border border-alert/40 bg-alert/10 px-4 py-3 text-left text-[12px] text-alert transition hover:bg-alert/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="block text-lg leading-none">■</span>
          <span className="mt-2 block">STOP AUCTION</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-3">
        <button
          type="button"
          disabled={disabled("next") || !isLive || hasCurrent}
          onClick={() => void runAuctionAction("next", () => supabase.rpc("caster_next_player"))}
          className="label-cond border border-gold/50 bg-gold/10 px-4 py-2.5 text-[12px] text-gold disabled:cursor-not-allowed disabled:opacity-35"
          title={!isLive ? "Start the auction first" : hasCurrent ? "Finalize the current player first" : "Pick the next player from the pool"}
        >
          NEXT PLAYER
        </button>

        <button
          type="button"
          disabled={disabled("final") || !hasCurrent || !isLive}
          onClick={() => void runAuctionAction("final", () => supabase.rpc("finalize_player_v3"))}
          className="label-cond bg-gold px-5 py-2.5 text-[12px] text-arena disabled:cursor-not-allowed disabled:opacity-35"
          title="Sell to the highest bidder or mark UNSOLD"
        >
          SOLD
        </button>

        <span className="ml-auto font-mono text-[10px] text-mut">
          {isLive ? "BIDDING OPEN" : isPaused ? "BIDDING PAUSED" : status === "stopped" ? "AUCTION STOPPED" : "READY TO START"}
        </span>
      </div>
    </section>
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
