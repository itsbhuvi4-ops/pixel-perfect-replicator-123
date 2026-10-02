import type { ReactNode } from "react";
import { useAuctionEvents, useAuctionState, useAmbassadors, useBids, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { useCasterCamStream } from "@/lib/use-caster-cam";
import { CasterLivePanel } from "@/components/CasterLivePanel";
import { PlayerStage } from "@/components/PlayerStage";
import { money } from "@/lib/format";
import { LiveTicker } from "@/components/LiveTicker";

export function LiveAuction({ audience = false }: { audience?: boolean }) {
  useRealtimeAuction();
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

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <section id="auction" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel px-4 py-3 ring-1 ring-line sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="live-dot size-2 rounded-full bg-alert" />
            <div className="min-w-0">
              <div className="label-cond text-[11px] text-gold">Bid X Auction</div>
              <h1 className="truncate font-display text-2xl sm:text-3xl">LIVE AUCTION ARENA</h1>
            </div>
            {isPaused && <span className="label-cond border border-gold/40 px-2 py-1 text-[10px] text-gold">PAUSED</span>}
            {isCompleted && <span className="label-cond border border-line px-2 py-1 text-[10px] text-mut">COMPLETED</span>}
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-mut">
            <span className={isLive ? "text-sold" : "text-mut"}>{isLive ? "ON AIR" : state?.status?.toUpperCase() ?? "WAITING"}</span>
            <span className="border border-line px-2 py-1">AUCTION VERIFIED</span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-xl bg-panel ring-1 ring-line">
              <PlayerStage player={current} state={state} />
            </div>

            {current && (
              <div className="rounded-xl bg-panel p-4 ring-1 ring-gold/30 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="label-cond text-[10px] text-mut">CURRENT HIGHEST BID</div>
                    <div className="bid-flash mt-1 font-display text-4xl text-gold sm:text-5xl">
                      {state?.current_bid ? money(state.current_bid) : "₹0"}
                    </div>
                  </div>
                  {highestBid && (
                    <div className="text-right">
                      <div className="label-cond text-[10px] text-mut">LEADING TEAM</div>
                      <div className="font-display text-xl">{highestBid.team}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[12px] text-mut">Player Information</div>
              {current ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Username" value={current.ingame_name} />
                  <Info label="UID" value={current.game_id} />
                  <Info label="Role" value={current.primary_role.replace("_", " ")} />
                  <Info label="Status" value={current.status.replace("_", " ")} />
                </div>
              ) : <p className="mt-3 text-sm text-mut">Waiting for the caster to start the auction.</p>}
            </div>

            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[12px] text-mut">Ambassador Bids</div>
              {bidderRows.length ? (
                <div className="mt-3 space-y-2">
                  {bidderRows.map(({ bid, team }) => (
                    <div key={bid.id} className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5 first:border-t-0">
                      <span className="truncate text-sm">{team}</span>
                      <span className="shrink-0 font-mono text-[12px] text-gold">{money(bid.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-mut">No bids yet.</p>}
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-xl bg-panel p-3 ring-1 ring-line sm:p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="label-cond text-[11px] text-mut">Caster Broadcast Cam</span>
                <span className="font-mono text-[9px] text-alert">LIVE</span>
              </div>
              <CasterLivePanel stream={camStream} status={camStatus} />
            </div>
            <LiveTicker events={events} />
            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[11px] text-mut">Auction Status</div>
              <div className="mt-2 font-display text-2xl">{current ? current.ingame_name : "WAITING"}</div>
              <div className="mt-1 font-mono text-[10px] text-mut">{current ? "CURRENT PLAYER" : "NO ACTIVE LOT"}</div>
            </div>
          </aside>
        </div>
      </section>

      <PublicSection id="top-sales" title="Top Sales">
        {sold.length ? sold.slice(0, 20).map((p) => (
          <Row key={p.id} left={p.ingame_name} right={p.sold_price ? money(p.sold_price) : "—"} />
        )) : <Empty text="No sold players yet." />}
      </PublicSection>

      <PublicSection id="unsold" title="Unsold">
        {unsold.length ? unsold.map((p) => <Row key={p.id} left={p.ingame_name} right="UNSOLD" />) : <Empty text="No unsold players yet." />}
      </PublicSection>

      <PublicSection id="teams" title="Teams">
        {ambassadors.length ? ambassadors.map((team) => (
          <Row key={team.id} left={team.team_name} right={money(team.remaining_points)} />
        )) : <Empty text="No teams registered yet." />}
      </PublicSection>

      <PublicSection id="points" title="Points">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ambassadors.map((team) => (
            <div key={team.id} className="rounded-lg bg-panel2 p-3">
              <div className="text-sm">{team.team_name}</div>
              <div className="mt-1 font-display text-2xl text-gold">{money(team.remaining_points)}</div>
            </div>
          ))}
          {!ambassadors.length && <Empty text="No points data yet." />}
        </div>
      </PublicSection>

      <PublicSection id="total-players" title="Total Players">
        <div className="font-display text-6xl text-gold">{players.length}</div>
      </PublicSection>

      <PublicSection id="about" title="About">
        <p className="text-base">Made by Bhuvi</p>
      </PublicSection>

      <PublicSection id="support" title="Support">
        <div className="space-y-2 text-sm">
          <p>Any queries</p>
          <p>Contact @gmail.com</p>
          <p>Discord Server</p>
        </div>
      </PublicSection>

      {audience && events.length > 0 ? (
        <div className="sr-only" aria-hidden="true">{events.length} live auction events</div>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel2 p-3">
      <div className="label-cond text-[10px] text-mut">{label}</div>
      <div className="mt-1 text-sm capitalize">{value}</div>
    </div>
  );
}

function PublicSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-20 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 py-3 last:border-0">
      <span className="truncate text-sm">{left}</span>
      <span className="shrink-0 font-mono text-[12px] text-gold">{right}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-mut">{text}</p>;
}
