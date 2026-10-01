import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/Guard";
import { CasterLivePanel } from "@/components/CasterLivePanel";
import { useAuctionState, useAuctionEvents, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { useCasterCamStream } from "@/lib/use-caster-cam";

export const Route = createFileRoute("/admin_/live-monitor")({
  component: () => <RoleGate role="admin"><AdminLiveMonitor /></RoleGate>,
});

function AdminLiveMonitor() {
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: events = [] } = useAuctionEvents();
  const { stream, status } = useCasterCamStream(state?.caster_cam_live ?? false);
  const current = players.find((p) => p.id === state?.current_player_id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-4xl">Live Monitor</h1><p className="mt-1 font-mono text-[11px] text-mut">Caster camera and realtime auction health</p></div>
        <span className="label-cond border border-line bg-panel px-3 py-1 text-[11px] text-mut">{status.toUpperCase()}</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <CasterLivePanel stream={stream} status={status} />
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Auction Status</div><div className="mt-1 font-display text-3xl">{state?.status ?? "—"}</div>
          <div className="mt-4 label-cond text-[12px] text-mut">Current Player</div><div className="mt-1 font-display text-2xl">{current?.ingame_name ?? "—"}</div>
          <div className="mt-4 label-cond text-[12px] text-mut">Current Bid</div><div className="font-display text-3xl text-gold">{state?.current_bid ?? "—"}</div>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="label-cond text-[12px] text-mut">Realtime Events</div>
        <div className="mt-2 space-y-2">{events.slice(0, 12).map((event) => (
          <div key={event.id} className="flex gap-3 border-b border-line py-2 last:border-0">
            <span className="font-mono text-[10px] text-mut">{new Date(event.created_at).toLocaleTimeString()}</span><span className="text-[12px]">{event.message}</span>
          </div>
        ))}</div>
      </div>
    </main>
  );
}
