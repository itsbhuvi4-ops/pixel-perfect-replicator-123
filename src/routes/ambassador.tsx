import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { PlayerStage } from "@/components/PlayerStage";
import { CasterLivePanel } from "@/components/CasterLivePanel";
import { useAuth } from "@/lib/auth";
import {
  useAmbassadors,
  useAuctionEvents,
  useAuctionState,
  useBids,
  useMyAmbassador,
  useMyRoster,
  usePlayers,
  useRealtimeAuction,
  minimumNextBid,
} from "@/lib/auction";
import { money } from "@/lib/format";
import { useCasterCamStream } from "@/lib/use-caster-cam";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ambassador")({
  head: () => ({ meta: [{ title: "Ambassador — Bid X Auction" }, { name: "robots", content: "noindex" },
      { name: "description", content: "Your BIDXAUCTION team, points, roster and live bidding workspace." },
      { property: "og:title", content: "Ambassador — BIDXAUCTION" },
      { property: "og:description", content: "Your BIDXAUCTION team, points, roster and live bidding workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: () => (
    <RoleGate role="ambassador">
      <AmbassadorConsole />
    </RoleGate>
  ),
});

export function AmbassadorConsole() {
  const { user } = useAuth();
  useRealtimeAuction();
  const { data: me } = useMyAmbassador(user?.id);
  const { data: roster = [] } = useMyRoster(me?.id);
  const { data: events = [] } = useAuctionEvents(18);
  const { data: auctionState } = useAuctionState();
  const { data: currentBids = [] } = useBids(auctionState?.current_player_id);

  if (!me) return <Center>No ambassador profile is linked to this account.</Center>;

  const latestBid = currentBids
    .filter((bid) => bid.ambassador_id === me.id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const spent = Math.max(0, me.starting_points - me.remaining_points);
  const budgetPercent = me.starting_points > 0
    ? Math.min(100, Math.max(0, (me.remaining_points / me.starting_points) * 100))
    : 0;

  return (
    <main className="role-canvas mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <section id="profile" className="scroll-mt-20 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
        <p className="selection-label w-fit bg-coral px-3 py-1 text-xs">AMBASSADOR WORKSPACE</p>
        <h1 className="mt-3 font-display text-5xl">Profile</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Username" value={me.ambassador_name} />
          <Field label="Password" value="••••••••" />
          <Field label="Team Name" value={me.team_name} />
        </div>
      </section>

      <section id="auction" className="mt-5 scroll-mt-20">
        <h2 className="mb-3 font-display text-4xl">Auction</h2>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <PlayerAuction />
          </div>
          <div className="min-w-0">
            <CasterCamera />
          </div>
        </div>
      </section>

      <section id="team" className="mt-5 scroll-mt-20 space-y-4">
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="selection-label w-fit bg-gold px-3 py-1 text-xs text-arena">TEAM WAR ROOM</p>
              <h2 className="mt-3 font-display text-4xl">LIVE TEAM STATUS</h2>
            </div>
            <span className="label-cond border border-line px-3 py-2 text-[10px] text-mut">
              {auctionState?.status === "live" ? "● AUCTION LIVE" : (auctionState?.status ?? "WAITING").toUpperCase()}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <WarMetric label="STARTING POINTS" value={money(me.starting_points)} />
            <WarMetric label="REMAINING POINTS" value={money(me.remaining_points)} accent />
            <WarMetric label="PURCHASED PLAYERS" value={String(roster.length)} />
          </div>
          <div className="mt-4 rounded-lg bg-panel2 p-4">
            <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
              <span>{money(me.starting_points)} POINTS</span>
              <span className="text-mut">{money(me.remaining_points)} REMAINING</span>
              <span className="text-gold">{roster.length} PLAYERS</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-arena">
              <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: budgetPercent + "%" }} />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-mut">
              <span>SPENT {money(spent)}</span>
              <span>{Math.round(budgetPercent)}% BUDGET REMAINING</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <WarMetric label="LATEST BID" value={latestBid ? money(latestBid.amount) : "—"} />
            <WarMetric label="TOTAL SPENT" value={money(spent)} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">PURCHASE HISTORY</div>
            <div className="mt-3 space-y-2">
              {roster.length ? roster.map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg bg-panel2 px-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{player.ingame_name}</div>
                    <div className="mt-1 font-mono text-[10px] text-mut">{player.sold_at ? new Date(player.sold_at).toLocaleString() : "Purchased"}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[12px] text-gold">{player.sold_price != null ? money(player.sold_price) : "—"}</div>
                    <div className="font-mono text-[9px] text-mut">SOLD</div>
                  </div>
                </div>
              )) : <p className="text-sm text-mut">No players purchased yet.</p>}
            </div>
          </section>
          <section className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="flex items-center justify-between">
              <div className="label-cond text-[12px] text-mut">LIVE AUCTION ACTIVITY</div>
              <span className="font-mono text-[9px] text-mut">REALTIME</span>
            </div>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {events.length ? events.map((event) => (
                <div key={event.id} className="rounded-lg bg-panel2 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-cond text-[10px] text-foreground">{event.event_type.replaceAll("_", " ")}</span>
                    <span className="font-mono text-[9px] text-mut">{new Date(event.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-mut">{event.message}</p>
                </div>
              )) : <p className="text-sm text-mut">Waiting for live auction activity.</p>}
            </div>
          </section>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
          <div className="flex items-center justify-between">
            <div><div className="label-cond text-[12px] text-mut">ROSTER</div><h3 className="mt-1 font-display text-3xl">{me.team_name}</h3></div>
            <span className="label-cond border border-line px-3 py-2 text-[10px] text-mut">{roster.length} PLAYERS</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roster.length ? roster.map((player) => (
              <div key={player.id} className="rounded-lg bg-panel2 p-3">
                <div className="text-sm">{player.ingame_name}</div>
                <div className="mt-1 font-mono text-[11px] text-mut">{player.primary_role.replace("_", " ")}</div>
                {player.sold_price != null && <div className="mt-2 font-mono text-[12px] text-gold">{money(player.sold_price)}</div>}
              </div>
            )) : <p className="text-sm text-mut">No players in the team yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function PlayerAuction() {
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const { data: bids = [] } = useBids(current?.id);
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: me } = useMyAmbassador(useAuth().user?.id);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const live = state?.status === "live" && !!current && !!state?.bidding_open;
  const minNext = minimumNextBid(state);

  const bid = async (amount: number) => {
    if (!me) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("place_bid_v3", {
        p_amount: amount,
        p_idempotency_key: crypto.randomUUID(),
      });
      if (error) throw error;
      toast.success(`Bid ${money(amount)} placed`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auction_state"] }),
        qc.invalidateQueries({ queryKey: ["bids"] }),
        qc.invalidateQueries({ queryKey: ["ambassadors"] }),
      ]);
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const amounts = [minNext, minNext + (state?.min_increment ?? 0), minNext + 2 * (state?.min_increment ?? 0)]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-panel ring-1 ring-line">
        <PlayerStage player={current} state={state} />
      </div>
      <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="label-cond text-[12px] text-mut">Player Information</div>
        {current ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Username" value={current.ingame_name} />
            <Field label="UID" value={current.game_id} />
            <Field label="Role" value={current.primary_role.replace("_", " ")} />
            <Field label="Current Bid" value={state?.current_bid ? money(state.current_bid) : "—"} />
          </div>
        ) : <p className="mt-3 text-sm text-mut">Waiting for the auction.</p>}
      </div>
      <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="label-cond text-[12px] text-mut">Current Bidders</div>
        <div className="mt-3 space-y-2">
          {bids.length ? bids.slice().sort((a,b)=>b.amount-a.amount).map((b) => (
            <div key={b.id} className="flex justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
              <span>{ambassadors.find((a) => a.id === b.ambassador_id)?.team_name ?? "Ambassador"}</span>
              <span className="font-mono text-[12px] text-gold">{money(b.amount)}</span>
            </div>
          )) : <p className="text-sm text-mut">No bids yet.</p>}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {amounts.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={!live || busy || amount > (me?.remaining_points ?? 0)}
              onClick={() => void bid(amount)}
              className="min-h-11 rounded-lg bg-gold px-4 py-2 font-cond text-[13px] text-arena disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bid {money(amount)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-panel2 p-4">
      <div className="label-cond text-[10px] text-mut">{label}</div>
      <div className={accent ? "mt-2 font-display text-3xl text-gold" : "mt-2 font-display text-3xl"}>{value}</div>
    </div>
  );
}

function CasterCamera() {
  const { data: state } = useAuctionState();
  const { stream, status } = useCasterCamStream(Boolean(state?.caster_cam_live), state?.caster_session_id ?? null);
  return <CasterLivePanel stream={stream} status={status} />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel2 p-3">
      <div className="label-cond text-[10px] text-mut">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
