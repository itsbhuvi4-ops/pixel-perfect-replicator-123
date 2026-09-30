import { useEffect, useRef } from "react";
import type { AuctionState, Player } from "@/lib/auction";
import { ROLE_LABELS } from "@/lib/format";
import { attachStream } from "@/lib/caster-cam";

export function CasterCamPip({
  stream,
  embedUrl,
  large,
}: {
  stream: MediaStream | null;
  embedUrl?: string | null;
  large?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => attachStream(ref.current, stream), [stream]);
  if (!stream && !embedUrl) return null;
  return (
    <div
      className={
        large
          ? "absolute top-4 right-4 w-40 overflow-hidden rounded-xl bg-panel ring-1 ring-gold/50 sm:w-52"
          : "absolute top-3 right-3 w-28 overflow-hidden rounded-xl bg-panel ring-1 ring-gold/40"
      }
    >
      <div className="aspect-square">
        {stream ? (
          <video ref={ref} autoPlay playsInline muted className="size-full object-cover" />
        ) : (
          <iframe
            src={embedUrl!}
            title="Caster face cam"
            allow="autoplay; encrypted-media; picture-in-picture"
            className="size-full"
          />
        )}
      </div>
      <span className="label-cond flex items-center justify-center gap-1 bg-black/60 py-0.5 text-center text-[9px]">
        <i className="live-dot size-1 rounded-full bg-alert" />
        Caster Cam
      </span>
    </div>
  );
}

export function PlayerStage({
  player,
  state,
  camStream,
}: {
  player: Player | null;
  state: AuctionState | null | undefined;
  camStream?: MediaStream | null;
}) {
  const embed = state?.caster_stream_url ?? null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-panel2 outline-1 -outline-offset-1 outline-line">
      {player?.video_url ? (
        <video
          key={player.id}
          src={player.video_url}
          poster={player.photo_url ?? undefined}
          controls
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
      ) : player?.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.ingame_name}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="label-cond text-[12px] text-mut">
            {player ? "No media uploaded" : "Waiting for the next player"}
          </span>
        </div>
      )}

      {player && state?.status === "live" && (
        <span className="label-cond absolute top-3 left-3 bg-alert px-2 py-0.5 text-[11px] text-white">
          Live Lot {player.lot_number ?? ""}
        </span>
      )}
      {state?.status === "paused" && (
        <span className="label-cond absolute top-3 left-3 border border-line bg-arena/90 px-2 py-0.5 text-[11px] text-mut">
          Paused
        </span>
      )}

      <CasterCamPip stream={camStream ?? null} embedUrl={embed} />

      {player && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-arena/85 px-5 py-4">
          <div>
            <div className="label-cond text-[12px] text-gold">{player.player_name}</div>
            <div className="font-display text-4xl leading-none md:text-5xl">
              {player.ingame_name}
            </div>
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
