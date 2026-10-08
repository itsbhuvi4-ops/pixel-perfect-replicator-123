import { supabase } from "@/integrations/supabase/client";

const RULES = {
  "player-photos": {
    maxBytes: 10 * 1024 * 1024,
    sourceMaxBytes: 50 * 1024 * 1024,
    mime: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  },
  "player-videos": {
    maxBytes: 100 * 1024 * 1024,
    sourceMaxBytes: 500 * 1024 * 1024,
    mime: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  },
} as const;

const PHOTO_COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const PHOTO_MAX_DIMENSION = 1920;
const VIDEO_COMPRESS_THRESHOLD = 30 * 1024 * 1024;
const VIDEO_MAX_WIDTH = 1280;
const VIDEO_MAX_HEIGHT = 720;
const VIDEO_BITRATE = 2_200_000;
const AUDIO_BITRATE = 96_000;

export type PlayerUpload = { path: string; url: string };

export type UploadProgress = {
  stage: "compressing" | "uploading";
  kind: "photo" | "video";
  percent?: number;
};

function replaceExtension(name: string, extension: string) {
  return name.replace(/\.[^/.]+$/, "") + extension;
}

function blobToFile(blob: Blob, name: string) {
  return new File([blob], name, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

async function compressPhoto(file: File, onProgress?: (percent: number) => void): Promise<File> {
  if (file.size <= PHOTO_COMPRESS_THRESHOLD) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The selected photo could not be decoded"));
    });

    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo compression is not supported by this browser");

    context.drawImage(image, 0, 0, width, height);
    onProgress?.(35);

    const webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const type = webpSupported ? "image/webp" : "image/jpeg";
    const extension = webpSupported ? ".webp" : ".jpg";

    let quality = 0.82;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      if (blob && blob.size <= PHOTO_COMPRESS_THRESHOLD) break;
      quality -= 0.08;
      onProgress?.(45 + attempt * 10);
    }

    if (!blob || blob.size >= file.size) {
      onProgress?.(100);
      return file;
    }

    onProgress?.(100);
    return blobToFile(blob, replaceExtension(file.name, extension));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getVideoRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function compressVideo(file: File, onProgress?: (percent: number) => void): Promise<File> {
  if (file.size <= VIDEO_COMPRESS_THRESHOLD) return file;

  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot automatically compress large videos. Please use Chrome, Edge, or Firefox.");
  }

  const recorderMime = getVideoRecorderMimeType();
  if (!recorderMime) {
    throw new Error("This browser cannot automatically compress large videos. Please use Chrome, Edge, or Firefox.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("The selected video could not be decoded"));
    });

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight || !Number.isFinite(video.duration)) {
      throw new Error("The selected video has invalid dimensions or duration");
    }

    const scale = Math.min(1, VIDEO_MAX_WIDTH / sourceWidth, VIDEO_MAX_HEIGHT / sourceHeight);
    const width = Math.max(2, Math.round(sourceWidth * scale / 2) * 2);
    const height = Math.max(2, Math.round(sourceHeight * scale / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Video compression is not supported by this browser");

    const canvasStream = canvas.captureStream(30);
    const sourceStream =
      typeof (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream === "function"
        ? (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream()
        : typeof (video as HTMLVideoElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream === "function"
          ? (video as HTMLVideoElement & { mozCaptureStream: () => MediaStream }).mozCaptureStream()
          : null;

    if (!sourceStream) {
      throw new Error("This browser cannot automatically compress video. Please use Chrome, Edge, or Firefox.");
    }

    for (const track of sourceStream.getAudioTracks()) {
      canvasStream.addTrack(track);
    }

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: recorderMime,
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    });

    const output = await new Promise<Blob>((resolve, reject) => {
      let failed = false;
      const fail = (error: unknown) => {
        if (failed) return;
        failed = true;
        try { recorder.stop(); } catch { /* already stopped */ }
        reject(error instanceof Error ? error : new Error("Video compression failed"));
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => fail(new Error("Video compression failed"));
      recorder.onstop = () => {
        if (!failed) resolve(new Blob(chunks, { type: recorderMime }));
      };

      const drawFrame = () => {
        if (failed) return;
        context.drawImage(video, 0, 0, width, height);
        const percent = Math.min(99, Math.round((video.currentTime / video.duration) * 100));
        onProgress?.(percent);
        if (!video.ended) requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        context.drawImage(video, 0, 0, width, height);
        onProgress?.(100);
        recorder.stop();
      };

      recorder.start(250);
      void video.play().catch(fail);
      requestAnimationFrame(drawFrame);
    });

    const compressedName = replaceExtension(file.name, ".webm");
    const compressedFile = blobToFile(output, compressedName);
    return compressedFile.size < file.size ? compressedFile : file;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function preparePlayerFile(
  bucket: "player-photos" | "player-videos",
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<File> {
  if (bucket === "player-photos") {
    onProgress?.({ stage: "compressing", kind: "photo", percent: 0 });
    return compressPhoto(file, (percent) => onProgress?.({ stage: "compressing", kind: "photo", percent }));
  }

  onProgress?.({ stage: "compressing", kind: "video", percent: 0 });
  return compressVideo(file, (percent) => onProgress?.({ stage: "compressing", kind: "video", percent }));
}

export async function uploadPlayerFile(
  bucket: "player-photos" | "player-videos",
  uid: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<PlayerUpload> {
  const rule = RULES[bucket];
  if (!rule.mime.has(file.type as never)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`${bucket === "player-photos" ? "Photo" : "Video"} is too large`);
  }

  const optimized = await preparePlayerFile(bucket, file, onProgress);
  if (optimized.size > rule.maxBytes) {
    throw new Error(`${bucket === "player-photos" ? "Photo" : "Video"} is still too large after compression`);
  }

  onProgress?.({ stage: "uploading", kind: bucket === "player-photos" ? "photo" : "video", percent: 0 });

  const safeName = optimized.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${uid}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, optimized, {
    cacheControl: "3600",
    upsert: false,
    contentType: optimized.type,
  });
  if (error) throw error;

  onProgress?.({ stage: "uploading", kind: bucket === "player-photos" ? "photo" : "video", percent: 100 });

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function playerStoragePath(bucket: "player-photos" | "player-videos", url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const start = url.indexOf(marker);
  const signedStart = url.indexOf(signedMarker);
  if (start >= 0) {
    const part = url.slice(start + marker.length).split("?")[0];
    return part ? decodeURIComponent(part) : null;
  }
  if (signedStart >= 0) {
    const part = url.slice(signedStart + signedMarker.length).split("?")[0];
    return part ? decodeURIComponent(part) : null;
  }
  return null;
}

export async function removePlayerFile(bucket: "player-photos" | "player-videos", path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
