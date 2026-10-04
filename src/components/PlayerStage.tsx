import { useEffect, useRef, useState } from "react";
import type { AuctionState, Player } from "@/lib/auction";
import { ROLE_LABELS, money } from "@/lib/format";

export function PlayerStage({ player, state }: { player: Player | null; state: AuctionState | null | undefined }) {
  const [reveal, setReveal] = useState(false);
  const [revealIntro, setRevealIntro] = useState(true);
  const lastPlayerId = useRef<string | null>(null);

  useEffect(() => {
    if (!player?.id || player.id === lastPlayerId.current) return;
    lastPlayerId.current = player.id;
    setReveal(true);
    setRevealIntro(true);
    const introTimer = window.setTimeout(() => setRevealIntro(false), 1100);
    const timer = window.setTimeout(() => setReveal(false), 3500);
    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(timer);
    };
  }, [player?.id]);

  const intro = revealIntro;
  const branding = state as (AuctionState & { tournament_season?: string | null; tournament_logo_url?: string | null; auction_branding?: string | null }) | null | undefined;

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-panel2 outline-1 -outline-offset-1 outline-line">
      {player?.video_url ? (
        <video
          key={player.id}
          src={player.video_url}
          poster={player.photo_url ?? undefined}
          autoPlay
          muted
          playsInline
          controls
          className="absolute inset-0 size-full object-contain bg-black"
        />
      ) : player?.photo_url ? (
        <img src={player.photo_url} alt={player.ingame_name} className="absolute inset-0 size-full object-contain bg-black" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="label-cond text-[12px] text-mut">
            {player ? "No media uploaded" : "Waiting for the next player"}
          </span>
        </div>
      )}

      {player && reveal && (
        <div className="absolute inset-0 z-20 overflow-hidden bg-black/95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.18),transparent_48%)]" />
          <div className="relative grid h-full place-items-center px-6 text-center">
            {intro ? (
              <div className="animate-pulse">
                <div className="flex items-center justify-center gap-2">
                  {branding?.tournament_logo_url && <img src={branding.tournament_logo_url} alt="" className="size-8 rounded object-contain bg-black/50" />}
                  <div className="label-cond text-[11px] tracking-[0.45em] text-gold">{branding?.auction_branding ?? "BIDXAUCTION"} · {branding?.tournament_season ?? "LIVE"}</div>
                </div>
                <div className="mt-4 font-display text-6xl leading-none tracking-tight text-white sm:text-8xl">NEXT PLAYER</div>
                <div className="mx-auto mt-5 h-px w-28 bg-gold/70" />
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="label-cond text-[11px] tracking-[0.35em] text-gold">PLAYER REVEAL</div>
                <div className="mt-3 font-display text-5xl leading-none text-white sm:text-7xl">{player.ingame_name}</div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="label-cond border border-gold/50 px-3 py-1 text-[11px] text-gold">{ROLE_LABELS[player.primary_role]}</span>
                  {player.secondary_role && <span className="label-cond border border-line px-3 py-1 text-[11px] text-mut">{ROLE_LABELS[player.secondary_role]}</span>}
                  <span className="label-cond border border-line px-3 py-1 text-[11px] text-white">STARTING {state?.base_price ? money(state.base_price) : "—"}</span>
                </div>
                <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-mut">
                  {state?.tournament_name ?? "BIDX AUCTION"} · {branding?.tournament_season ?? "SEASON 1"} · BIDDING OPENS
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {player && state?.status === "live" && (
        <span className="label-cond absolute left-3 top-3 bg-alert px-2 py-0.5 text-[11px] text-white">
          Live Lot {player.lot_number ?? ""}
        </span>
      )}
      {state?.status === "paused" && (
        <span className="label-cond absolute left-3 top-3 border border-line bg-arena/90 px-2 py-0.5 text-[11px] text-mut">
          Paused
        </span>
      )}

      {player && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-arena/85 px-5 py-4">
          <div>
            <div className="label-cond text-[12px] text-gold">{player.player_name}</div>
            <div className="font-display text-4xl leading-none md:text-5xl">{player.ingame_name}</div>
            <div className="mt-1 font-mono text-[11px] text-mut">
              ID {player.game_id} · {state?.tournament_name}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span className="label-cond border border-gold/50 px-2 py-1 text-[11px] text-gold">
              {ROLE_LABELS[player.primary_role]}
            </span>
            {player.secondary_role && (
              <span className="label-cond border border-line px-2 py-1 text-[11px] text-mut">
                {ROLE_LABELS[player.secondary_role]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
