import { createFileRoute } from "@tanstack/react-router";
import { PlayerStage } from "@/components/PlayerStage";
import { LiveTicker } from "@/components/LiveTicker";
import {
  useAmbassadors,
  useAuctionEvents,
  useAuctionState,
  usePlayers,
  useRealtimeAuction,
  minimumNextBid,
} from "@/lib/auction";
import { useCasterCamStream } from "@/lib/use-caster-cam";
import { initials, money } from "@/lib/format";

/**
 * Broadcast View — clean fullscreen output for OBS / YouTube capture.
 * No header, no navigation; everything on one screen, sized for 16:9.
 */
export const Route = createFileRoute("/broadcast")({
  head: () => ({
    meta: [
      { title: "Broadcast — BidX Auction" },
      { name: "description", content: "Fullscreen broadcast output for OBS and YouTube." },
    ],
  }),
  component: BroadcastPage,
});

function BroadcastPage() {
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: events = [] } = useAuctionEvents();
  const { stream: camStream } = useCasterCamStream(state?.caster_cam_live ?? false);
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
  const sold = players.filter((p) => ["sold", "retained"].includes(p.status));

  return (
    <main className="flex h-screen min-h-0 flex-col gap-3 overflow-hidden p-3">
      <div className="flex items-center gap-4 border-b border-line pb-2">
        <span className="font-display text-2xl tracking-wide">
          {state?.tournament_name ?? "BIDX AUCTION"}
        </span>
        {state?.status === "live" && (
          <span className="label-cond flex items-center gap-1.5 bg-alert px-2 py-0.5 text-[12px] text-white">
            <i className="live-dot size-1.5 rounded-full bg-white" /> LIVE
          </span>
        )}
        {state?.status === "paused" && (
          <span className="label-cond border border-line px-2 py-0.5 text-[12px] text-mut">PAUSED</span>
        )}
        <span className="label-cond ml-auto font-mono text-[12px] text-mut">
          LOT {current?.lot_number ?? "—"} · {sold.length} SOLD
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_260px] gap-3">
        <PlayerStage player={current} state={state} camStream={camStream} />
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">Current Bid</div>
            <div key={state?.current_bid ?? 0} className="bid-flash font-display text-4xl text-gold">
              {state?.current_bid ? money(state.current_bid) : "—"}
            </div>
            <div className="mt-1 font-mono text-[11px] text-mut">
              Next min {money(minimumNextBid(state))}
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <div className="label-cond text-[12px] text-mut">Highest Bidder</div>
              <div className="font-display text-2xl">{leader?.team_name ?? "—"}</div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-panel p-3 ring-1 ring-line">
            <div className="label-cond mb-2 text-[12px] text-mut">Leaderboard</div>
            <div className="flex flex-col gap-1 overflow-hidden">
              {ambassadors
                .slice()
                .sort((a, b) => b.remaining_points - a.remaining_points)
                .slice(0, 8)
                .map((amb) => (
                  <div
                    key={amb.id}
                    className={
                      amb.id === state?.current_bidder_id
                        ? "flex items-center gap-2 rounded-lg bg-panel2 px-2 py-1.5 outline-1 -outline-offset-1 outline-gold/40"
                        : "flex items-center gap-2 px-2 py-1"
                    }
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-panel2 font-display text-[11px] ring-1 ring-line">
                      {initials(amb.team_name)}
                    </span>
                    <span className="label-cond truncate text-[12px]">{amb.team_name}</span>
                    <span className="ml-auto font-mono text-[11px] text-mut">
                      {money(amb.remaining_points)}
                    </span>
                  </div>
                ))}
              {ambassadors.length === 0 && (
                <p className="font-mono text-[11px] text-mut">No teams yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <LiveTicker events={events} />
    </main>
  );
}
