import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRELOADER_TIMING, preloaderPhase } from "@/lib/preloader-timeline";

const WORDMARK = "BIDXAUCTION";
const FACES = [
  '"Times New Roman", serif',
  '"Arial Black", sans-serif',
  '"Courier New", monospace',
  'Georgia, serif',
  'Impact, sans-serif',
  '"Palatino Linotype", serif',
  'Arial, sans-serif',
];

/** The source opening is a locked-off, film-textured, independently morphing wordmark. */
function drawOpening(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, colors: string[], reduced: boolean) {
  const [background = "", ink = "", accent = "", dust = ""] = colors;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const resolved = reduced || seconds >= PRELOADER_TIMING.settle;
  const referenceSeconds = seconds * (17.8 / PRELOADER_TIMING.settle);
  const reveal = reduced ? 1 : Math.min(1, Math.max(0.12, referenceSeconds / 1.6));
  const size = Math.min(width * 0.068, height * 0.16, 108);
  const cell = size * 0.82;
  const total = cell * WORDMARK.length;
  const drift = resolved ? 0 : Math.sin(referenceSeconds * 0.29) * size * 0.014;
  const zoom = resolved ? 1 : 0.975 + Math.min(referenceSeconds / 18, 1) * 0.025;

  ctx.save();
  ctx.translate(width / 2 + drift, height / 2);
  ctx.scale(zoom, zoom);
  for (let i = 0; i < WORDMARK.length; i++) {
    // Different cuts per letter recreate the asynchronous montage rather than a word-wide glitch.
    const cut = Math.floor(referenceSeconds * (i % 3 === 0 ? 3.7 : 2.9) + i * 2.37);
    const face = resolved ? 1 : (cut * 5 + i * 3) % FACES.length;
    const italic = !resolved && (cut + i) % 4 === 0;
    const scaleY = resolved ? 1 : ([1, 0.86, 1.15, 0.96][(cut + i) % 4] ?? 1);
    const letterSize = size * (resolved ? 1 : ([1, 0.8, 1.08, 0.92, 1.16][(cut + i * 2) % 5] ?? 1));
    ctx.save();
    ctx.translate(-total / 2 + cell * (i + 0.5), resolved ? 0 : Math.sin(cut + i) * size * 0.028);
    ctx.scale(1, scaleY);
    ctx.rotate(italic ? -0.045 : 0);
    ctx.font = `${italic ? "italic" : "normal"} ${face === 2 || face === 6 ? 400 : 700} ${letterSize}px ${FACES[face]}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = reveal * (resolved ? 1 : 0.8 + Math.sin(seconds * 9 + i) * 0.08);
    ctx.fillStyle = ink;
    ctx.shadowColor = resolved ? accent : ink;
    ctx.shadowBlur = resolved ? size * 0.12 : size * (face === 4 ? 0.22 : 0.11);
    ctx.fillText(WORDMARK.charAt(i), 0, 0);
    // Fine outlined alternate impressions, never substitute unrelated symbols for the brand.
    if (!resolved && face === 5) {
      ctx.shadowBlur = size * 0.06;
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = ink;
      ctx.strokeText(WORDMARK.charAt(i), 1.2, -0.8);
    }
    ctx.restore();
  }
  ctx.restore();

  if (!reduced) {
    // Deterministic fine film dust, with no decorative particles or futuristic UI.
    const frame = Math.floor(seconds * 15);
    ctx.fillStyle = dust;
    for (let i = 0; i < 95; i++) {
      const seed = (i * 127.1 + frame * 311.7);
      const x = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
      const y = ((Math.sin(seed * 1.37) * 19341.719) % 1 + 1) % 1;
      ctx.globalAlpha = resolved ? 0.03 : 0.08;
      ctx.fillRect(x * width, y * height, i % 4 === 0 ? 1.3 : 0.6, 0.7);
    }
  }
  ctx.globalAlpha = 1;
}

export function BrandPreloader({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    const layer = overlay.current;
    const context = element?.getContext("2d");
    if (!element || !layer || !context) {
      setFinished(true);
      return;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["--opening-background", "--opening-ink", "--opening-accent", "--opening-dust"].map((token) => getComputedStyle(layer).getPropertyValue(token).trim());
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let animationFrame = 0;
    const startedAt = performance.now();
    const handoff = window.setTimeout(() => setFinished(true),
      (motion.matches ? PRELOADER_TIMING.reducedEnd : PRELOADER_TIMING.end) * 1000);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = layer.clientWidth;
      height = layer.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const tick = (now: number) => {
      // Wall-clock timing reveals the website after seven seconds even after a slow frame.
      const elapsed = (now - startedAt) / 1000;
      const phase = preloaderPhase(elapsed, motion.matches);
      if (phase === "done") {
        setFinished(true);
        return;
      }
      drawOpening(context, width, height, elapsed, colors, motion.matches);
      layer.style.opacity = phase === "fade" ? String(Math.max(0, 1 - (elapsed - PRELOADER_TIMING.fade) / (PRELOADER_TIMING.end - PRELOADER_TIMING.fade))) : "1";
      element.dataset['phase'] = phase;
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => {
      window.clearTimeout(handoff);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Restore scrolling after the opening; the app stays mounted and can load underneath.
  useEffect(() => {
    if (finished) document.body.style.overflow = "";
  }, [finished]);

  return (
    <>
      <div inert={!finished} aria-hidden={!finished}>{children}</div>
      {!finished && (
        <div ref={overlay} className="brand-opening" role="status" aria-label="BIDXAUCTION">
          <span className="brand-opening-fallback" aria-hidden="true">BIDXAUCTION</span>
          <canvas ref={canvas} className="brand-opening-canvas" aria-hidden="true" />
        </div>
      )}
    </>
  );
}