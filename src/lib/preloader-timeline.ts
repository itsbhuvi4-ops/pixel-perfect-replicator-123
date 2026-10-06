/** Reference: 30fps opening, with independent letter cuts followed by a resolved hold. */
export const PRELOADER_TIMING = {
  reveal: 0.35,
  settle: 17.8,
  fade: 20.3,
  end: 21.1,
  reducedEnd: 1.25,
} as const;

export function preloaderPhase(seconds: number, reducedMotion = false) {
  if (reducedMotion) return seconds >= PRELOADER_TIMING.reducedEnd ? "done" : "hold";
  if (seconds >= PRELOADER_TIMING.end) return "done";
  if (seconds >= PRELOADER_TIMING.fade) return "fade";
  if (seconds >= PRELOADER_TIMING.settle) return "hold";
  return "cycling";
}