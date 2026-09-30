import { useEffect, useState } from "react";
import { watchCasterCam, type CamStatus } from "@/lib/caster-cam";

/** Viewer hook: joins the WebRTC caster cam while `enabled` (usually auction live + cam flag). */
export function useCasterCamStream(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");
  useEffect(() => {
    if (!enabled) {
      setStream(null);
      setStatus("idle");
      return;
    }
    return watchCasterCam(setStream, setStatus);
  }, [enabled]);
  return { stream, status };
}
