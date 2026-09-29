import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlayerStage } from "@/components/PlayerStage";
import { RoleGate, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { minimumNextBid, useAmbassadors, useAuctionState, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { money } from "@/lib/format";

export const Route = createFileRoute("/ambassador")({
  head: () => ({
    meta: [
      { title: "Ambassador Console — RA Auctions" },
      { name: "description", content: "Place live bids for your team." },
      { property: "og:title", content: "Ambassador Console — RA Auctions" },
      { property: "og:description", content: "Place live bids for your team." },
    ],
  }),
  component: () => (
    <RoleGate role="ambassador">
      <Console />
    </RoleGate>
  ),
});

function Console() {
  useRealtimeAuction();
  const { user } = useAuth();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const me = ambassadors.find((a) => a.user_id === user?.id);
  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
  const min = minimumNextBid(state);
  const inc = state?.min_increment ?? 0;
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = players.filter((p) => p.ambassador_id === me?.id && p.status === "sold");

  const leading = me && state?.current_bidder_id === me.id;
  const canBid = state?.status === "live" && current?.status === "in_auction" && !leading && !busy;

  const bid = async (amount: number) => {
    setBusy(true);
    const { error } = await supabase.rpc("place_bid", { p_amount: amount });
    setBusy(false);
    if (error) toast.error(errText(error));
    else setCustom("");
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[1fr_360px]">
      <PlayerStage player={current} state={state} />
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">{me?.team_name ?? "Your team"}</div>
          <div className="font-display text-4xl text-gold">{money(me?.remaining_points)}</div>
          <div className="font-mono text-[11px] text-mut">remaining of {money(me?.starting_points)}</div>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Current bid</div>
          <div className="font-display text-4xl">{state?.current_bid ? money(state.current_bid) : "—"}</div>
          <div className="font-mono text-[11px] text-mut">
            {leading ? "You are the highest bidder" : leader ? `Leader: ${leader.team_name}` : "No bids yet"}
          </div>
          {state?.status !== "live" && (
            <p className="mt-3 border border-line bg-panel2 px-3 py-2 text-sm text-mut">
              Bidding is {state?.status === "paused" ? "paused" : "closed"}.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 3].map((k) => {
              const amt = min + k * inc;
              return (
                <button key={k} disabled={!canBid || (me?.remaining_points ?? 0) < amt} onClick={() => bid(amt)}
                  className="label-cond bg-gold py-3 text-[12px] text-arena disabled:opacity-40">
                  {money(amt)}
                </button>
              );
            })}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(custom); if (n >= min) bid(n); else toast.error(`Minimum is ${money(min)}`); }}>
            <input className="field flex-1" inputMode="numeric" placeholder={`Custom ≥ ${min}`} value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} />
            <button disabled={!canBid || !custom} className="label-cond border border-gold px-3 text-[12px] text-gold disabled:opacity-40">Bid</button>
          </form>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Your squad ({mine.length})</div>
          {mine.map((p) => (
            <div key={p.id} className="flex justify-between py-1 text-sm">
              <span>{p.ingame_name}</span><span className="font-mono text-gold">{money(p.sold_price)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
