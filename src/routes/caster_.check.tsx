import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate, errText } from "@/components/Guard";
import { useAmbassadors } from "@/lib/auction";
import { useOnlineAmbassadors } from "@/lib/presence";

export const Route = createFileRoute("/caster/check")({
  head: () => ({
    meta: [
      { title: "Equipment Check — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role={["caster", "admin"]}>
      <CasterCheckPage />
    </RoleGate>
  ),
});

function CasterCheckPage() {
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <p className="label-cond text-[11px] text-gold">CASTER</p>
      <h1 className="mt-1 font-display text-4xl">Check</h1>
      <p className="mt-1 text-sm text-mut">
        Test your camera and microphone before going live, and see which ambassadors are online.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <EquipmentCheck />
        <AmbassadorStatus />
      </div>
    </main>
  );
}

function EquipmentCheck() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoId, setVideoId] = useState("default");
  const [audioId, setAudioId] = useState("default");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camPermission, setCamPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "videoinput" || d.kind === "audioinput")))
      .catch(() => {});
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (stream) void videoRef.current.play().catch(() => {});
  }, [stream]);

  const startCamera = async () => {
    if (stream) return;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: videoId === "default" ? true : { deviceId: { exact: videoId } },
        audio: audioId === "default" ? true : { deviceId: { exact: audioId } },
      });
      setStream(next);
      setCamPermission("granted");
      setMicPermission(next.getAudioTracks().length ? "granted" : "denied");
      toast.success("Camera and microphone are working");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setCamPermission("denied");
        setMicPermission("denied");
        toast.error("Camera permission is required to start the caster stream.");
      } else if (name === "NotFoundError") {
        toast.error("No camera or microphone found on this device.");
      } else {
        toast.error(errText(err));
      }
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const toggleMic = () => {
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    // Force re-render so the mic status label updates.
    setStream(stream ? new MediaStream(stream.getTracks()) : null);
  };

  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const audioDevices = devices.filter((d) => d.kind === "audioinput");
  const micOn = stream?.getAudioTracks()[0]?.enabled ?? false;
  const camOn = !!stream && (stream.getVideoTracks()[0]?.readyState === "live");

  return (
    <section className="rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl">Camera & Microphone</h2>
        <div className="flex gap-2 font-mono text-[10px]">
          <span className={`rounded-full border px-2.5 py-1 ${camOn ? "border-sold/50 text-sold" : "border-line text-mut"}`}>
            CAMERA {camOn ? "ON" : "OFF"}
          </span>
          <span className={`rounded-full border px-2.5 py-1 ${micOn ? "border-sold/50 text-sold" : "border-line text-mut"}`}>
            MIC {micOn ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div className="relative mt-3 aspect-video overflow-hidden rounded-lg bg-black">
        {stream ? (
          <video ref={videoRef} muted playsInline autoPlay className="size-full object-cover" />
        ) : (
          <div className="label-cond grid size-full place-items-center text-[12px] text-mut">
            CAMERA PREVIEW — PRESS START CAMERA
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select className="field" value={videoId} onChange={(e) => setVideoId(e.target.value)} disabled={!!stream}>
          <option value="default">Default camera</option>
          {videoDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera"}</option>)}
        </select>
        <select className="field" value={audioId} onChange={(e) => setAudioId(e.target.value)} disabled={!!stream}>
          <option value="default">Default microphone</option>
          {audioDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone"}</option>)}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {!stream ? (
          <button onClick={() => void startCamera()} className="label-cond bg-gold py-2.5 text-[12px] text-arena">
            Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="label-cond border border-alert/50 bg-alert/10 py-2.5 text-[12px] text-alert">
            Stop Camera
          </button>
        )}
        <button onClick={toggleMic} disabled={!stream} className="label-cond border border-line py-2.5 text-[12px] text-mut disabled:opacity-40">
          {micOn ? "Mute Microphone" : "Unmute Microphone"}
        </button>
        <div className="label-cond grid place-items-center border border-line py-2.5 text-[10px] text-mut">
          CAM PERMISSION: {camPermission.toUpperCase()}
        </div>
        <div className="label-cond grid place-items-center border border-line py-2.5 text-[10px] text-mut">
          MIC PERMISSION: {micPermission.toUpperCase()}
        </div>
      </div>
    </section>
  );
}

function AmbassadorStatus() {
  const { data: ambassadors = [] } = useAmbassadors();
  const online = useOnlineAmbassadors();

  return (
    <section className="rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-display text-2xl">Ambassadors</h2>
      <p className="mt-1 text-xs text-mut">Live online/offline status.</p>
      <div className="mt-3 space-y-2">
        {ambassadors.length ? ambassadors.map((a, i) => {
          const isOnline = !!online[a.id];
          return (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                AMBASSADOR #{String(i + 1).padStart(2, "0")} · {a.team_name}
              </span>
              <span className={`label-cond shrink-0 px-2 py-0.5 text-[10px] ${isOnline ? "text-sold" : "text-mut"}`}>
                <span className={`mr-1.5 inline-block size-1.5 rounded-full ${isOnline ? "bg-sold live-dot" : "bg-mut"}`} />
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          );
        }) : <p className="text-sm text-mut">No ambassadors registered yet.</p>}
      </div>
    </section>
  );
}
