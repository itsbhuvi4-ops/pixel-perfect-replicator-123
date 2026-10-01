import { useEffect, useRef, useState } from "react";
import { attachStream, type CamStatus } from "@/lib/caster-cam";

const labels: Record<CamStatus, string> = {
  idle: "CASTER OFFLINE",
  connecting: "CONNECTING...",
  live: "● LIVE",
  ended: "CASTER OFFLINE",
  error: "RECONNECTING...",
};

export function CasterLivePanel({
  stream,
  status,
  className = "",
}: {
  stream: MediaStream | null;
  status: CamStatus;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [needsPlayback, setNeedsPlayback] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    attachStream(el, stream);
    if (!stream) {
      setNeedsPlayback(false);
      return;
    }

    // Start muted so mobile/browser autoplay policies cannot block the actual video.
    // Audio can be enabled explicitly by the viewer.
    el.muted = true;
    void el.play().then(() => setNeedsPlayback(false)).catch(() => setNeedsPlayback(true));
  }, [stream]);

  const enableAudio = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    void el.play().then(() => setNeedsPlayback(false)).catch(() => setNeedsPlayback(true));
  };

  return (
    <section className={`relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-line ${className}`}>
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-black/70 px-2 py-1">
        <span className="label-cond text-[11px] text-white">CASTER LIVE</span>
        <span className={`label-cond text-[10px] ${status === "live" ? "text-alert" : "text-mut"}`}>{labels[status]}</span>
      </div>
      {stream ? (
        <>
          <video
            ref={ref}
            autoPlay
            muted
            playsInline
            controls={false}
            className="block aspect-video w-full object-cover"
          />
          {needsPlayback && (
            <button
              onClick={enableAudio}
              className="absolute inset-0 grid place-items-center bg-black/45 px-4 text-center label-cond text-[12px] text-white"
            >
              TAP TO ENABLE LIVE VIDEO / AUDIO
            </button>
          )}
          {!needsPlayback && (
            <button
              type="button"
              onClick={enableAudio}
              className="absolute bottom-3 right-3 z-10 rounded-md bg-black/70 px-2.5 py-1.5 font-mono text-[10px] text-white"
            >
              ENABLE AUDIO
            </button>
          )}
        </>
      ) : (
        <div className="grid aspect-video min-h-[180px] w-full place-items-center sm:min-h-[220px]">
          <div className="px-4 text-center">
            <div className="label-cond text-[12px] text-mut">{labels[status]}</div>
            <div className="mt-1 font-mono text-[10px] text-mut">
              {status === "connecting" ? "Waiting for the caster camera..." : "Live camera will appear here"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
