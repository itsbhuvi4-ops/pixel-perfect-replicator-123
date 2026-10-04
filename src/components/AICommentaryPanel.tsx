import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { generateCommentary } from "@/lib/commentary.functions";
import type { Ambassador, AuctionEvent, AuctionState, Player } from "@/lib/auction";

type Style = "hype" | "analytical" | "calm";

export function AICommentaryPanel({
  state, player, leader, bidCount, events,
}: {
  state: AuctionState | null | undefined;
  player: Player | null;
  leader: Ambassador | undefined;
  bidCount: number;
  events: AuctionEvent[];
}) {
  const run = useServerFn(generateCommentary);
  const [style, setStyle] = useState<Style>("hype");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const p = player as (Player & { team_name?: string | null; experience?: string | null }) | null;
      const res = await run({
        data: {
          style,
          notes,
          player: p
            ? {
                name: p.ingame_name,
                uid: p.game_id,
                primaryRole: p.primary_role.replace("_", " "),
                secondaryRole: p.secondary_role ? String(p.secondary_role).replace("_", " ") : null,
                teamName: p.team_name ?? null,
                experience: p.experience ?? null,
              }
            : null,
          auction: {
            status: state?.status ?? "not_started",
            biddingOpen: Boolean((state as { bidding_open?: boolean } | null)?.bidding_open),
            currentBid: state?.current_bid ?? null,
            basePrice: state?.base_price ?? 0,
            leadingTeam: leader?.team_name ?? null,
            bidCount,
            recentEvents: events.slice(0, 6).map((e) => e.message.slice(0, 200)),
          },
        },
      });
      if (res.success) setLines((l) => [res.text, ...l].slice(0, 5));
      else setError(res.error);
    } catch {
      setError("Couldn't reach the commentary service.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="label-cond flex items-center gap-2 text-[12px] text-mut"><Sparkles className="size-4 text-primary" /> AI Commentary</div>
        <span className="font-mono text-[10px] text-mut">{player ? player.ingame_name : "NO PLAYER"}</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {(["hype", "analytical", "calm"] as Style[]).map((s) => (
          <button key={s} onClick={() => setStyle(s)}
            className={`flex-1 rounded-full px-3 py-1.5 font-cond text-xs uppercase transition-colors ${style === s ? "bg-primary text-primary-foreground" : "bg-panel2 text-mut hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 600))} rows={3}
        placeholder="Your notes: e.g. clutch sniper, crowd favourite, two teams fighting…"
        className="mt-3 w-full resize-none rounded-xl border border-line bg-panel2 p-3 text-sm placeholder:text-mut focus:outline-none focus:ring-2 focus:ring-ring" />
      <button onClick={go} disabled={busy}
        className="mt-3 w-full rounded-xl bg-primary py-2.5 font-cond text-sm font-semibold uppercase text-primary-foreground transition-opacity disabled:opacity-60">
        {busy ? "Writing…" : "Generate commentary"}
      </button>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      <div className="mt-3 space-y-2">
        {lines.map((t, i) => (
          <div key={i} className={`group relative rounded-xl p-3 text-sm leading-6 ${i === 0 ? "bg-primary/15 ring-1 ring-primary/40" : "bg-panel2 text-mut"}`}>
            {t}
            <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(t); toast.success("Copied"); }}
              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"><Copy className="size-3.5" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
