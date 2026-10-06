import { useEffect, useState } from "react";
import { watchCasterCam, type CamStatus } from "@/lib/caster-cam";

/** Viewer hook: joins only the currently active caster session. */
export function useCasterCamStream(enabled: boolean, sessionId: string | null | undefined) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>("idle");

  useEffect(() => {
    if (!enabled || !sessionId) {
      setStream(null);
      setStatus("idle");
      return;
    }
    return watchCasterCam(sessionId, setStream, setStatus);
  }, [enabled, sessionId]);

  return { stream, status };
}
