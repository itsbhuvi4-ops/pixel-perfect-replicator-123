import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { PlayerStage } from "@/components/PlayerStage";
import { LiveTicker } from "@/components/LiveTicker";
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
  type Player,
} from "@/lib/auction";
import { ROLE_LABELS, money, plainPoints } from "@/lib/format";
import { useCasterCamStream } from "@/lib/use-caster-cam";
import { supabase } from "@/integrations/supabase/client";
import { CasterLivePanel } from "@/components/CasterLivePanel";

export const Route = createFileRoute("/ambassador")({
  head: () => ({
    meta: [
      { title: "Team Console — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role="ambassador">
      <AmbassadorConsole />
    </RoleGate>
  ),
});

function AmbassadorConsole() {
  const { user } = useAuth();
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: me } = useMyAmbassador(user?.id);
  const { data: roster = [] } = useMyRoster(me?.id);
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: events = [] } = useAuctionEvents();
  const { stream: camStream, status: camStatus } = useCasterCamStream(state?.caster_cam_live ?? false);
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
  const iLead = !!me && state?.current_bidder_id === me.id;
  const rank =
    ambassadors.slice().sort((a, b) => b.remaining_points - a.remaining_points).findIndex((a) => a.id === me?.id) + 1;

  if (!me)
    return (
      <Center>
        <p>No ambassador profile is linked to this account. Ask the admin to create your team.</p>
      </Center>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
      <LiveTicker events={events} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="My Points" value={plainPoints(me.remaining_points)} gold />
            <Stat label="Rank" value={`#${rank || "—"} / ${ambassadors.length}`} />
            <Stat label="Roster" value={`${roster.length} players`} />
            <Stat label="Lot" value={current ? `#${current.lot_number ?? "—"}` : "—"} />
          </div>
          <CasterLivePanel stream={camStream} status={camStatus} />
          <PlayerStage player={current} state={state} />
          <BidPanel />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
            <div className="label-cond text-[12px] text-mut">Current Lot</div>
            <div className="mt-1 font-display text-3xl">{current?.ingame_name ?? "—"}</div>
            <div className="mt-1 font-mono text-[11px] text-mut">
              {state?.current_bid
                ? iLead
                  ? `You lead with ${money(state.current_bid)}`
                  : `${leader?.team_name ?? "Someone"} leads ${money(state.current_bid)}`
                : `Base price ${money(state?.base_price ?? 0)}`}
            </div>
            <div className="mt-2 font-mono text-[11px]">
              {iLead ? (
                <span className="text-sold">★ You are the highest bidder</span>
              ) : (
                <span className="text-mut">Next min {money(minimumNextBid(state))}</span>
              )}
            </div>
          </div>
          <RosterPanel roster={roster} />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${gold ? "bg-gold/10 ring-gold/40" : "bg-panel ring-line"}`}>
      <div className="label-cond text-[12px] text-mut">{label}</div>
      <div className={`font-display text-3xl ${gold ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function BidPanel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: state } = useAuctionState();
  const { data: me } = useMyAmbassador(user?.id);
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: bids = [] } = useBids(state?.current_player_id);
  const { data: roster = [] } = useMyRoster(me?.id);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const live = state?.status === "live" && !!state?.current_player_id;
  const minNext = minimumNextBid(state);
  const inc = state?.min_increment ?? 0;
  const retainCount = roster.filter((p) => p.status === "retained").length;
  const retainsLeft = Math.max(0, (state?.max_retains ?? 1) - retainCount);
  const canRetain = live && state?.current_bid === null && !!me && retainsLeft > 0;
  const affordable = !!me && minNext <= me.remaining_points;

  const teamName = (id: string) => ambassadors.find((a) => a.id === id)?.team_name ?? "—";

  type RpcInvoke = () => PromiseLike<{ error: { message: string } | null; data?: unknown }>;
  const call = async (invoke: RpcInvoke, okMsg: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await invoke();
      if (error) throw error;
      toast.success(okMsg);
      setCustom("");
      await qc.invalidateQueries({ queryKey: ["auction_state"] });
      await qc.invalidateQueries({ queryKey: ["bids"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const bid = (amount: number) =>
    void call(
      () => supabase.rpc("place_bid_v3", { p_amount: amount, p_idempotency_key: crypto.randomUUID() }),
      `Bid of ${money(amount)} placed`,
    );

  const customBid = () => {
    const n = Number(custom.replace(/[^0-9]/g, ""));
    if (!n) {
      toast.error("Enter a valid amount");
      return;
    }
    bid(n);
  };

  const steps = [minNext, minNext + inc, minNext + 2 * inc].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div className="label-cond text-[12px] text-mut">Bid Control</div>
        <div className="font-mono text-[11px] text-mut">
          {live ? `${bids.length} bids this lot` : "Waiting for a lot"}
        </div>
      </div>

      {!live ? (
        <p className="mt-3 text-sm text-mut">
          {state?.status === "paused"
            ? "Auction is paused — bidding is locked."
            : "Bidding opens when the caster puts a player on the block."}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((amount, i) => (
              <button
                key={amount}
                disabled={busy || !me || amount > (me?.remaining_points ?? 0)}
                onClick={() => bid(amount)}
                className={
                  i === 0
                    ? "label-cond bg-gold px-4 py-2 text-[13px] text-arena transition-opacity hover:opacity-90 disabled:opacity-40"
                    : "label-cond border border-gold/40 bg-gold/10 px-3 py-2 text-[12px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-40"
                }
              >
                {i === 0 ? `Bid ${plainPoints(amount)}` : `+${plainPoints(amount - (state?.current_bid ?? 0))}`}
              </button>
            ))}
          </div>
          {!affordable && (
            <p className="mt-2 text-[12px] text-alert">
              You need {plainPoints(minNext)} points to bid next — you have {plainPoints(me?.remaining_points ?? 0)}.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <input
              className="field flex-1"
              inputMode="numeric"
              placeholder={`Custom amount ≥ ${plainPoints(minNext)}`}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button
              disabled={busy || !me || !custom}
              onClick={customBid}
              className="label-cond border border-line bg-panel2 px-4 py-2 text-[12px] text-mut hover:text-foreground disabled:opacity-40"
            >
              Place
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-mono text-[11px] text-mut">
              {retainsLeft > 0
                ? `Retain (${retainsLeft} left) — only before the first bid`
                : "No retains left"}
            </span>
            <button
              disabled={busy || !canRetain || (me?.remaining_points ?? 0) < (state?.retain_price ?? 0)}
              onClick={() => void call(() => supabase.rpc("retain_player_v3"), "Player retained to your roster")}
              className="label-cond border border-gold/50 px-3 py-1.5 text-[12px] text-gold disabled:opacity-40"
            >
              Retain for {plainPoints(state?.retain_price ?? 0)}
            </button>
          </div>
        </>
      )}

      {bids.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto border-t border-line pt-2">
          {bids.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-1 font-mono text-[11px] text-mut">
              <span className={b.ambassador_id === me?.id ? "text-gold" : ""}>{teamName(b.ambassador_id)}</span>
              <span>{money(b.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RosterPanel({ roster }: { roster: Player[] }) {
  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div className="label-cond text-[12px] text-mut">My Roster</div>
        <div className="font-mono text-[11px] text-mut">{roster.length} players</div>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {roster.length === 0 && <p className="font-mono text-[11px] text-mut">No players yet — start bidding!</p>}
        {roster.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg bg-panel2 px-2.5 py-2">
            <span
              className={`label-cond px-1.5 py-0.5 text-[10px] ${
                p.status === "retained" ? "bg-gold/15 text-gold" : "bg-sold/15 text-sold"
              }`}
            >
              {p.status === "retained" ? "RET" : `#${p.lot_number ?? ""}`}
            </span>
            <span className="label-cond truncate text-[13px]">{p.ingame_name}</span>
            <span className="ml-auto font-mono text-[11px] text-mut">{ROLE_LABELS[p.primary_role]}</span>
            <span className="font-mono text-[11px] text-gold">{plainPoints(p.sold_price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
