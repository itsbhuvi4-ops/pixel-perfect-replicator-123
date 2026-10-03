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
  head: () => ({ meta: [{ title: "Ambassador — Bid X Auction" }, { name: "robots", content: "noindex" }] }),
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

  if (!me) return <Center>No ambassador profile is linked to this account.</Center>;

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

      <section id="team" className="mt-5 scroll-mt-20 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
        <h2 className="font-display text-4xl">Team Information</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roster.length ? roster.map((player) => (
            <div key={player.id} className="rounded-lg bg-panel2 p-3">
              <div className="text-sm">{player.ingame_name}</div>
              <div className="mt-1 font-mono text-[11px] text-mut">{player.primary_role.replace("_", " ")}</div>
              {player.sold_price != null && <div className="mt-2 font-mono text-[12px] text-gold">{money(player.sold_price)}</div>}
            </div>
          )) : <p className="text-sm text-mut">No players in the team yet.</p>}
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

function CasterCamera() {
  const { stream, status } = useCasterCamStream(true);
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
