import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { PlayerStage } from "@/components/PlayerStage";
import { LiveTicker } from "@/components/LiveTicker";
import { AICommentaryPanel } from "@/components/AICommentaryPanel";
import { useAuctionEvents, useAuctionState, usePlayers, useRealtimeAuction, useAmbassadors, useBids } from "@/lib/auction";
import { claimCasterCamera, heartbeatCasterCamera, releaseCasterCamera, getCasterHostStatus, setAuctionStatus } from "@/lib/accounts.functions";
import { startCasterBroadcast, type CamStatus } from "@/lib/caster-cam";
import { money, statusLabel } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/caster")({
  head: () => ({
    meta: [
      { title: "Caster Console — BidX Auction" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Control BIDXAUCTION player reveals, bidding and live commentary." },
      { property: "og:title", content: "Caster Console — BIDXAUCTION" },
      { property: "og:description", content: "Control BIDXAUCTION player reveals, bidding and live commentary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { data: bids = [] } = useBids(current?.id);

  return (
    <main className="role-canvas mx-auto max-w-7xl px-3 py-5 sm:px-5">
      <section id="profile" className="mb-4 flex flex-wrap items-end justify-between gap-3 bg-panel p-4 ring-1 ring-line">
        <div><p className="selection-label w-fit bg-blue px-3 py-1 text-xs">CASTER WORKSPACE</p><h1 className="mt-3 font-display text-5xl">Auction Control</h1></div>
        <span className="label-cond bg-green px-3 py-2 text-xs text-foreground">BROADCAST READY</span>
      </section>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <section className="relative overflow-hidden rounded-xl bg-panel ring-1 ring-line">
            <PlayerStage player={current} state={state} />
            <AuctionResultFlash events={events} />
          </section>
          <AICommentaryPanel state={state} player={current} leader={leader} bidCount={bids.length} events={events} />
          <section className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">Player Information</div>
            {current ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Username" value={current.ingame_name} />
                <Info label="UID" value={current.game_id} />
                <Info label="Role" value={current.primary_role.replace("_", " ")} />
                <Info label="Current Bid" value={state?.current_bid ? money(state.current_bid) : "—"} />
              </div>
            ) : <p className="mt-3 text-sm text-mut">Waiting for auction start.</p>}
          </section>
          <section className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">Ambassador Bids</div>
            <div className="mt-3 space-y-2">
              {bids.length ? bids.slice().sort((a,b)=>b.amount-a.amount).map((b) => (
                <div key={b.id} className="flex justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
                  <span>{ambassadors.find((a) => a.id === b.ambassador_id)?.team_name ?? "Ambassador"}</span>
                  <span className="font-mono text-[12px] text-gold">{money(b.amount)}</span>
                </div>
              )) : <p className="text-sm text-mut">No bids yet.</p>}
            </div>
          </section>
          <AuctionControls />
          <LiveTicker events={events} />
        </div>
        <div className="min-w-0 space-y-4">
          <CasterCamCard />
          <section className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">Current Bid</div>
            <div className="mt-1 font-display text-4xl text-gold">{state?.current_bid ? money(state.current_bid) : "—"}</div>
            <div className="mt-1 font-mono text-[11px] text-mut">{leader?.team_name ?? "No bidder"}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

type RpcResult = { completed?: boolean; result?: string; next?: { completed?: boolean; player_id?: string } } | null;

function AuctionControls() {
  const qc = useQueryClient();
  const setStatus = useServerFn(setAuctionStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const finalizedDeadlineRef = useRef<string | null>(null);
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
      const result = await setStatus({ data: { status: next } });

      if (key === "start") {
        if (result?.selection?.completed) {
          toast.info("No eligible players remain — auction completed");
        } else {
          toast.success("Auction started — player selected automatically");
        }
      }

      await refresh();
      if (key !== "start") {
        toast.success(
          key === "pause" ? "Auction paused" :
          key === "resume" ? "Auction resumed" :
          "Auction stopped",
        );
      }
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  const finalizeCurrent = async () => {
    setBusy("final");
    try {
      const { error, data } = await supabase.rpc("finalize_player_v3");
      if (error) throw error;
      const result = data as RpcResult;
      await refresh();

      if (result?.result === "sold") toast.success("SOLD — points deducted and roster updated");
      else if (result?.result === "unsold") toast.info("UNSOLD — next player revealed automatically");
      else toast.success("Player finalized");

      if (result?.next?.completed) toast.info("Auction completed — no eligible players remain");
      else if (result?.next?.player_id) toast.success("Next player revealed automatically");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    const deadline = state?.bidding_deadline_at;
    if (!isLive || !state?.bidding_open || !deadline || !hasCurrent) return;
    if (finalizedDeadlineRef.current === deadline) return;

    const delay = Math.max(0, new Date(deadline).getTime() - Date.now());
    const timer = window.setTimeout(async () => {
      if (finalizedDeadlineRef.current === deadline) return;
      finalizedDeadlineRef.current = deadline;
      try {
        const { error } = await supabase.rpc("finalize_player_v3");
        if (error) throw error;
        await refresh();
        toast.info("Bidding time expired — player finalized by the server");
      } catch (err) {
        toast.error(errText(err));
      }
    }, delay + 50);

    return () => window.clearTimeout(timer);
  }, [state?.bidding_deadline_at, state?.bidding_open, isLive, hasCurrent]);

  const markUnsold = async () => {
    setBusy("unsold");
    try {
      const { error, data } = await supabase.rpc("caster_mark_unsold");
      if (error) throw error;
      const result = data as RpcResult;
      await refresh();
      if (result?.next?.completed) toast.info("Player unsold — auction completed");
      else toast.info("Player UNSOLD — next player revealed automatically");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(null);
    }
  };

  // The database remains the source of truth for the reveal -> bidding transition.
  // Player selection is performed only inside the server-side auction transaction.
  useEffect(() => {
    if (!isLive || !hasCurrent || state?.bidding_open) return;
    const timer = window.setTimeout(async () => {
      try {
        const { error } = await supabase.rpc("caster_open_bidding");
        if (error) throw error;
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["auction_state"] }),
          qc.invalidateQueries({ queryKey: ["players"] }),
          qc.invalidateQueries({ queryKey: ["auction_events"] }),
          qc.invalidateQueries({ queryKey: ["bids"] }),
        ]);
      } catch (err) {
        toast.error(errText(err));
      }
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [isLive, hasCurrent, state?.bidding_open]);

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
          disabled={disabled("start") || !canStart || hasCurrent}
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

      <div className="border-t border-line px-3 py-3">
        <AuctionCountdown state={state} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={disabled("final") || !hasCurrent || !isLive || !state?.bidding_open}
          onClick={() => void finalizeCurrent()}
          className="label-cond min-h-11 bg-gold px-5 py-2.5 text-[12px] text-arena disabled:cursor-not-allowed disabled:opacity-35"
          title="Finalize the current player. The server automatically reveals the next player."
        >
          SOLD / NEXT PLAYER
        </button>
        <button
          type="button"
          disabled={disabled("unsold") || !hasCurrent || !isLive || !!state?.current_bid}
          onClick={() => void markUnsold()}
          className="label-cond min-h-11 border border-line bg-panel2 px-5 py-2.5 text-[12px] text-mut disabled:cursor-not-allowed disabled:opacity-35"
        >
          UNSOLD / NEXT PLAYER
        </button>

        <span className="font-mono text-[10px] text-mut sm:ml-auto">
          {isLive && hasCurrent && !state?.bidding_open
            ? "PLAYER REVEAL — BIDDING OPENS AUTOMATICALLY"
            : isLive
              ? "BIDDING OPEN — NEXT PLAYER IS AUTOMATIC"
              : isPaused
                ? "BIDDING PAUSED"
                : status === "stopped"
                  ? "AUCTION STOPPED"
                  : "READY TO START"}
        </span>
      </div>
    </section>
  );
}

function AuctionCountdown({ state }: { state: ReturnType<typeof useAuctionState>["data"] }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = () => {
      if (!state?.current_player_id) {
        setSeconds(0);
        return;
      }
      if (state.bidding_open && state.bidding_deadline_at) {
        setSeconds(Math.max(0, Math.ceil((new Date(state.bidding_deadline_at).getTime() - Date.now()) / 1000)));
        return;
      }
      const age = Math.max(0, (Date.now() - new Date(state.updated_at).getTime()) / 1000);
      setSeconds(Math.max(0, Math.ceil(4 - age)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state?.current_player_id, state?.updated_at, state?.bidding_open, state?.bidding_deadline_at]);

  if (!state?.current_player_id || state.status !== "live") {
    return <div className="flex items-center justify-between font-mono text-[10px] text-mut"><span>COUNTDOWN</span><span>—</span></div>;
  }

  const reveal = !state.bidding_open;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="label-cond text-[10px] text-mut">{reveal ? "PLAYER REVEAL COUNTDOWN" : "BIDDING CLOCK"}</div>
        <div className={reveal ? "mt-1 font-display text-3xl" : "mt-1 font-display text-3xl text-gold"}>
          00:{String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div className="font-mono text-[10px] text-mut">
        {reveal ? "BIDDING OPENS AUTOMATICALLY" : "SERVER REMAINS SOURCE OF TRUTH"}
      </div>
    </div>
  );
}

function AuctionResultFlash({ events }: { events: Awaited<ReturnType<typeof useAuctionEvents>>["data"] }) {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<"SOLD" | "UNSOLD" | null>(null);
  const latest = events?.[0];

  useEffect(() => {
    if (!latest || !["PLAYER_SOLD", "PLAYER_UNSOLD"].includes(latest.event_type)) return;
    const age = Date.now() - new Date(latest.created_at).getTime();
    if (age > 5000) return;
    setLabel(latest.event_type === "PLAYER_SOLD" ? "SOLD" : "UNSOLD");
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(id);
  }, [latest?.id, latest?.created_at, latest?.event_type]);

  if (!visible || !label) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-[2px]">
      <div className={label === "SOLD"
        ? "animate-pulse border-2 border-gold bg-gold/15 px-10 py-5 font-display text-6xl tracking-widest text-gold shadow-2xl"
        : "animate-pulse border-2 border-line bg-arena/80 px-10 py-5 font-display text-6xl tracking-widest text-foreground shadow-2xl"}>
        {label}
      </div>
    </div>
  );
}

function CasterCamCard() {
  const qc = useQueryClient();
  const claim = useServerFn(claimCasterCamera);
  const heartbeat = useServerFn(heartbeatCasterCamera);
  const release = useServerFn(releaseCasterCamera);
  const hostStatus = useServerFn(getCasterHostStatus);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [hostActive, setHostActive] = useState(false);
  const [isCurrentHost, setIsCurrentHost] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);
  const [videoId, setVideoId] = useState("default");
  const [audioId, setAudioId] = useState("default");
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");
  const [viewers, setViewers] = useState(0);
  const [live, setLive] = useState(false);
  const stopRef = useRef<null | (() => void)>(null);
  const sessionRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "videoinput" || d.kind === "audioinput")))
      .catch(() => {});
    return () => stopRef.current?.();
  }, []);

  useEffect(() => {
    let stopped = false;
    const refreshHost = async () => {
      try {
        const next = await hostStatus();
        if (stopped) return;
        setHostActive(Boolean(next.host_active));
        setIsCurrentHost(Boolean(next.is_current_user_host));
        setHostName(next.host_name ?? null);
      } catch {
        // Camera start remains server-authoritative; a failed status read must
        // not grant host control.
      }
    };
    void refreshHost();
    const timer = window.setInterval(() => void refreshHost(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [hostStatus]);

  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.srcObject = preview;
    if (preview) void previewRef.current.play().catch(() => {});
  }, [preview]);
  useEffect(() => {
    if (!live || !sessionRef.current) return;
    const timer = window.setInterval(async () => {
      const sessionId = sessionRef.current;
      if (!sessionId) return;
      try {
        await heartbeat({ data: { sessionId } });
      } catch (err) {
        toast.error("Caster lease expired. Live broadcast stopped.");
        stopRef.current?.();
        stopRef.current = null;
        sessionRef.current = null;
        setLive(false);
        setStatus("error");
        setViewers(0);
        await qc.invalidateQueries({ queryKey: ["auction_state"] });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [live, heartbeat, qc]);



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
    if (hostActive && !isCurrentHost) {
      toast.error(hostName ? `${hostName} is currently hosting. You are on standby.` : "Another caster is currently hosting. You are on standby.");
      return;
    }
    try {
      const lease = await claim();
      sessionRef.current = lease.session_id;
      stopRef.current = await startCasterBroadcast(preview, (nextStatus, count) => {
        setStatus(nextStatus);
        if (count !== undefined) setViewers(count);
      }, lease.session_id);
      setLive(true);
      toast.success("● LIVE — Caster camera is broadcasting");
      await qc.invalidateQueries({ queryKey: ["auction_state"] });
    } catch (err) {
      stopRef.current?.();
      stopRef.current = null;
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      if (sessionId) await release({ data: { sessionId } }).catch(() => undefined);
      setLive(false);
      toast.error(errText(err));
    }
  };

  const stopLive = async () => {
    stopRef.current?.();
    stopRef.current = null;
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (sessionId) await release({ data: { sessionId } }).catch(() => undefined);
    if (preview) preview.getTracks().forEach((track) => track.stop());
    setPreview(null);
    setLive(false);
    setStatus("idle");
    setViewers(0);
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
          {!live ? <button onClick={() => void startLive()} disabled={!preview || (hostActive && !isCurrentHost)} className="label-cond bg-alert py-2 text-[12px] text-white disabled:opacity-40">Start Live</button> :
            <button onClick={() => void stopLive()} className="label-cond border border-alert/50 bg-alert/10 py-2 text-[12px] text-alert">Stop Live</button>}
        </div>
        {preview && !live && <button onClick={() => void stopLive()} className="label-cond border border-line py-2 text-[12px] text-mut">Stop Camera</button>}
        <p className="font-mono text-[11px] text-mut">Status: {status} · {viewers} viewer{viewers === 1 ? "" : "s"} · WebRTC peer-to-peer</p>
        {hostActive && !isCurrentHost && !live && (
          <p className="rounded-md border border-alert/30 bg-alert/10 px-3 py-2 font-mono text-[10px] text-alert">
            STANDBY — {hostName ? `${hostName} is currently hosting` : "another caster is currently hosting"}
          </p>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-panel2 p-3"><div className="label-cond text-[10px] text-mut">{label}</div><div className="mt-1 text-sm capitalize">{value}</div></div>; }
