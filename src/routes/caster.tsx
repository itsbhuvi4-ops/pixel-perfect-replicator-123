import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlayerStage } from "@/components/PlayerStage";
import { TeamRail } from "@/components/TeamRail";
import { RoleGate, errText } from "@/components/Guard";
import { setStreamUrl } from "@/lib/accounts.functions";
import { useAmbassadors, useAuctionState, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { money } from "@/lib/format";

export const Route = createFileRoute("/caster")({
  head: () => ({
    meta: [
      { title: "Caster Broadcast — RA Auctions" },
      { name: "description", content: "Run the live auction broadcast." },
      { property: "og:title", content: "Caster Broadcast — RA Auctions" },
      { property: "og:description", content: "Run the live auction broadcast." },
    ],
  }),
  component: () => (
    <RoleGate role={["caster", "admin"]}>
      <Broadcast />
    </RoleGate>
  ),
});

function Broadcast() {
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const saveUrl = useServerFn(setStreamUrl);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setUrl(state?.caster_stream_url ?? ""), [state?.caster_stream_url]);

  const current = players.find((p) => p.id === state?.current_player_id) ?? null;
  const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
  const pool = players.filter((p) => p.status === "pool").length;
  const inLot = current?.status === "in_auction";

  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) toast.error(errText(error));
    else toast.success(ok);
  };

  const btn = "label-cond px-4 py-3 text-[13px] disabled:opacity-40";
  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <PlayerStage player={current} state={state} />
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="label-cond text-[12px] text-mut">Current bid</div>
              <div className="font-display text-4xl text-gold">{state?.current_bid ? money(state.current_bid) : "—"}</div>
              <div className="font-mono text-[11px] text-mut">{leader ? leader.team_name : "No bids"} · {pool} left in pool</div>
            </div>
            <span className="label-cond border border-line px-2 py-1 text-[12px]">{state?.status?.replace("_", " ")}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(state?.status === "not_started" || state?.status === "paused") && (
              <button disabled={busy} className={`${btn} bg-sold text-arena`} onClick={() => run(() => supabase.rpc("caster_set_status", { p_status: "live" }), "Auction live")}>
                {state?.status === "paused" ? "Resume" : "Start auction"}
              </button>
            )}
            {state?.status === "live" && (
              <button disabled={busy} className={`${btn} border border-line bg-panel2`} onClick={() => run(() => supabase.rpc("caster_set_status", { p_status: "paused" }), "Paused")}>
                Pause
              </button>
            )}
            <button disabled={busy || state?.status !== "live" || inLot} className={`${btn} bg-gold text-arena`} onClick={() => run(() => supabase.rpc("caster_next_player"), "Next player drawn")}>
              Next player
            </button>
            <button disabled={busy || state?.status !== "live" || !inLot} className={`${btn} bg-alert text-foreground`}
              onClick={() => { if (confirm("End bidding for this player? The result is final.")) run(() => supabase.rpc("caster_end_bidding"), "Bidding ended"); }}>
              End bidding
            </button>
          </div>
        </div>
        <form className="flex gap-2 rounded-xl bg-panel p-4 ring-1 ring-line" onSubmit={async (e) => {
          e.preventDefault();
          try { await saveUrl({ data: { url } }); toast.success("Caster cam updated"); } catch (err) { toast.error(errText(err)); }
        }}>
          <input className="field flex-1" placeholder="Face-cam embed URL (e.g. YouTube embed link)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="label-cond border border-gold px-3 text-[12px] text-gold">Save</button>
        </form>
      </div>
      <TeamRail ambassadors={ambassadors} leaderId={state?.current_bidder_id} />
    </main>
  );
}
