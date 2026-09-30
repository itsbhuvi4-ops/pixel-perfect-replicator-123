import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayerStage } from "@/components/PlayerStage";
import { TeamRail } from "@/components/TeamRail";
import { LiveTicker } from "@/components/LiveTicker";
import {
  useAmbassadors,
  useAuctionEvents,
  useAuctionState,
  usePlayers,
  useRealtimeAuction,
  minimumNextBid,
} from "@/lib/auction";
import { money } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Auction — RA Auctions" },
      { name: "description", content: "Watch the esports player auction live: current player, highest bid and teams." },
      { property: "og:title", content: "Live Auction — RA Auctions" },
      { property: "og:description", content: "Watch the esports player auction live with real-time bids." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: events = [] } = useAuctionEvents();
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
  const sold = players.filter((p) => p.status === "sold").length;
  const pool = players.filter((p) => p.status === "pool").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <LiveTicker events={events} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <PlayerStage player={current} state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[12px] text-mut">Current Bid</div>
              <div key={state?.current_bid ?? 0} className="bid-flash font-display text-5xl text-gold">
                {state?.current_bid ? money(state.current_bid) : "—"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-mut">
                Next minimum {money(minimumNextBid(state))}
              </div>
            </div>
            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[12px] text-mut">Highest Bidder</div>
              <div className="font-display text-4xl">{leader?.team_name ?? "No bids yet"}</div>
              <div className="mt-1 font-mono text-[11px] text-mut">
                {statusLabel(state?.status)} · {sold} sold · {pool} in pool
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-[13px]">
            <Link to="/player/register" className="label-cond border border-line bg-panel2 px-3 py-2 hover:text-gold">
              Register as player
            </Link>
          </div>
        </div>
        <TeamRail ambassadors={ambassadors} leaderId={state?.current_bidder_id ?? null} />
      </div>
    </main>
  );
}

function statusLabel(s?: string) {
  return s === "live" ? "LIVE" : s === "paused" ? "PAUSED" : s === "completed" ? "COMPLETED" : "NOT STARTED";
}
