import { useEffect, useState } from "react";
import { useAuctionEvents, useAuctionState, useAmbassadors, useBids, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { useCasterCamStream } from "@/lib/use-caster-cam";
import { CasterLivePanel } from "@/components/CasterLivePanel";
import { PlayerStage } from "@/components/PlayerStage";
import { money } from "@/lib/format";
import { LiveTicker } from "@/components/LiveTicker";

type PublicPanel = "top-sales" | "unsold" | "teams" | "points" | "total-players" | "about" | "support" | null;

export function LiveAuction({ audience = false }: { audience?: boolean }) {
  useRealtimeAuction();
  const [panel, setPanel] = useState<PublicPanel>(null);

  useEffect(() => {
    const syncPanelFromMenu = () => {
      const hash = window.location.hash.replace("#", "");
      const allowed: PublicPanel[] = ["top-sales", "unsold", "teams", "points", "total-players", "about", "support"];
      setPanel(allowed.includes(hash as PublicPanel) ? (hash as PublicPanel) : null);
    };
    syncPanelFromMenu();
    window.addEventListener("hashchange", syncPanelFromMenu);
    return () => window.removeEventListener("hashchange", syncPanelFromMenu);
  }, []);
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: events = [] } = useAuctionEvents();
  const { stream: camStream, status: camStatus } = useCasterCamStream(true);
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const { data: bids = [] } = useBids(current?.id);

  const sold = players.filter((p) => p.status === "sold").sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0));
  const unsold = players.filter((p) => p.status === "unsold");
  const bidderRows = bids
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .map((bid) => ({
      bid,
      team: ambassadors.find((a) => a.id === bid.ambassador_id)?.team_name ?? "Ambassador",
    }));

  const isLive = state?.status === "live";
  const isPaused = state?.status === "paused";
  const isCompleted = state?.status === "completed";
  const highestBid = bidderRows[0];

  const openPanel = (next: PublicPanel) => setPanel(next);
  const closePanel = () => {
    setPanel(null);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  return (
    <main className="auction-canvas role-canvas min-h-screen bg-[#030208] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030208]/92 px-3 py-3 backdrop-blur-md sm:px-5">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="live-dot size-2 shrink-0 rounded-full bg-alert" />
            <div className="min-w-0">
              <div className="label-cond text-[9px] tracking-[.2em] text-gold">BIDXAUCTION</div>
              <h1 className="truncate font-display text-xl tracking-wide sm:text-2xl">LIVE AUCTION ARENA</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-mono text-[9px] sm:text-[10px]">
            <span className={isLive ? "text-sold" : "text-mut"}>{isLive ? "● ON AIR" : state?.status?.toUpperCase() ?? "WAITING"}</span>
            <span className="hidden border border-line px-2 py-1 sm:inline-block">AUCTION VERIFIED</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 sm:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.75fr)_minmax(310px,.75fr)]">
          <div className="min-w-0 overflow-hidden rounded-xl bg-panel ring-1 ring-line">
            <PlayerStage player={current} state={state} />
          </div>

          <aside className="min-w-0 space-y-3">
            <div className="overflow-hidden rounded-xl bg-panel ring-1 ring-line">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="label-cond text-[10px] text-mut">CASTER LIVE SCREEN</span>
                <span className="font-mono text-[9px] text-alert">LIVE</span>
              </div>
              <div className="aspect-video bg-black">
                <CasterLivePanel stream={camStream} status={camStatus} />
              </div>
            </div>

            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="flex items-center justify-between">
                <span className="label-cond text-[10px] text-mut">AUCTION STATUS</span>
                {isPaused && <span className="label-cond text-[10px] text-gold">PAUSED</span>}
                {isCompleted && <span className="label-cond text-[10px] text-mut">COMPLETED</span>}
              </div>
              <div className="mt-2 font-display text-3xl">{current?.ingame_name ?? "WAITING"}</div>
              <div className="mt-1 font-mono text-[9px] uppercase text-mut">{current ? "CURRENT PLAYER" : "WAITING FOR NEXT LOT"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-panel p-4 ring-1 ring-gold/25">
                <div className="label-cond text-[9px] text-mut">CURRENT BID</div>
                <div className="mt-1 font-display text-3xl text-gold">{money(state?.current_bid ?? 0)}</div>
              </div>
              <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
                <div className="label-cond text-[9px] text-mut">BASE BID</div>
                <div className="mt-1 font-display text-3xl">{money(state?.base_price ?? 0)}</div>
              </div>
            </div>

            {highestBid && (
              <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
                <div className="label-cond text-[9px] text-mut">LEADING TEAM</div>
                <div className="mt-1 font-display text-xl">{highestBid.team}</div>
                <div className="mt-1 font-mono text-[10px] text-gold">{money(highestBid.bid.amount)} · {bids.length} BIDS</div>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,.4fr)]">
          <div className="rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="label-cond text-[11px] tracking-[.15em] text-mut">PLAYER INFORMATION</div>
              {current && <span className="font-mono text-[9px] text-gold">{current.status.replace("_", " ").toUpperCase()}</span>}
            </div>
            {current ? (
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <Info label="IGN" value={current.ingame_name} />
                <Info label="UID" value={current.game_id} />
                <Info label="ROLE" value={current.primary_role.replace("_", " ")} />
                <Info label="STARTING" value={money(state?.base_price ?? 0)} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-mut">Waiting for the caster to start the auction.</p>
            )}
          </div>
          <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[11px] text-mut">LIVE BID FEED</div>
            <div className="mt-2 max-h-20 overflow-hidden">
              {bidderRows.slice(0, 3).map(({ bid, team }) => (
                <div key={bid.id} className="flex justify-between border-t border-line/60 py-1.5 text-[10px]">
                  <span className="truncate">{team}</span><span className="font-mono text-gold">{money(bid.amount)}</span>
                </div>
              ))}
              {!bidderRows.length && <span className="text-xs text-mut">No bids yet.</span>}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <LiveTicker events={events} />
        </div>

      {panel && (
        <PublicPanelModal
          panel={panel}
          players={players}
          sold={sold}
          unsold={unsold}
          ambassadors={ambassadors}
          onClose={closePanel}
        />
      )}

      {audience && events.length > 0 ? <div className="sr-only" aria-hidden="true">{events.length} live auction events</div> : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel2 p-3">
      <div className="label-cond text-[9px] text-mut">{label}</div>
      <div className="mt-1 truncate text-sm capitalize">{value}</div>
    </div>
  );
}

function PublicPanelModal({
  panel,
  players,
  sold,
  unsold,
  ambassadors,
  onClose,
}: {
  panel: Exclude<PublicPanel, null>;
  players: any[];
  sold: any[];
  unsold: any[];
  ambassadors: any[];
  onClose: () => void;
}) {
  const titles: Record<Exclude<PublicPanel, null>, string> = {
    "top-sales": "TOP SALES",
    unsold: "UNSOLD PLAYERS",
    teams: "TEAMS",
    points: "TEAM POINTS",
    "total-players": "TOTAL PLAYERS",
    about: "ABOUT BIDXAUCTION",
    support: "SUPPORT",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button aria-label="Close panel" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#08070e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="label-cond text-[9px] tracking-[.2em] text-gold">BIDXAUCTION</div>
            <h2 className="font-display text-2xl">{titles[panel]}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">CLOSE ×</button>
        </div>
        <div className="overflow-y-auto p-5">
          {panel === "top-sales" && (
            <div className="space-y-1">{sold.length ? sold.slice(0, 50).map((p, i) => <Row key={p.id} left={`#${i + 1} · ${p.ingame_name}`} right={p.sold_price ? money(p.sold_price) : "—"} />) : <Empty text="No sold players yet." />}</div>
          )}
          {panel === "unsold" && (
            <div className="space-y-1">{unsold.length ? unsold.map((p) => <Row key={p.id} left={p.ingame_name} right="UNSOLD" />) : <Empty text="No unsold players yet." />}</div>
          )}
          {panel === "teams" && (
            <div className="space-y-1">{ambassadors.length ? ambassadors.map((team) => <Row key={team.id} left={team.team_name} right={money(team.remaining_points)} />) : <Empty text="No teams registered yet." />}</div>
          )}
          {panel === "points" && (
            <div className="grid gap-2 sm:grid-cols-2">{ambassadors.map((team) => <div key={team.id} className="rounded-lg bg-panel2 p-4"><div className="text-sm">{team.team_name}</div><div className="mt-1 font-display text-3xl text-gold">{money(team.remaining_points)}</div></div>)}{!ambassadors.length && <Empty text="No points data yet." />}</div>
          )}
          {panel === "total-players" && (
            <div className="text-center py-10"><div className="font-display text-8xl text-gold">{players.length}</div><div className="mt-2 label-cond text-xs text-mut">REGISTERED PLAYERS</div></div>
          )}
          {panel === "about" && (
            <div className="space-y-3 text-sm leading-7 text-white/65"><p>BIDXAUCTION is a live player auction experience built for competitive esports communities.</p><p>Watch the player reveal, follow every bid, and see teams compete for their next roster addition in real time.</p><p className="text-white">Created by Bhuvi.</p></div>
          )}
          {panel === "support" && (
            <div className="space-y-3 text-sm text-white/70"><p>Need help during the auction?</p><p>Contact the auction support team through the configured support channel.</p><button type="button" className="rounded-full border border-violet-300/30 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[.15em] text-violet-200">Contact Support</button></div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-line/60 py-3 last:border-0"><span className="truncate text-sm">{left}</span><span className="shrink-0 font-mono text-[12px] text-gold">{right}</span></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-mut">{text}</p>;
}
