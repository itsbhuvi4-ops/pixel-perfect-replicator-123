import { supabase } from "@/integrations/supabase/client";

const RULES = {
  "player-photos": {
    maxBytes: 10 * 1024 * 1024,
    mime: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  },
  "player-videos": {
    maxBytes: 100 * 1024 * 1024,
    mime: new Set(["video/mp4", "video/webm", "video/quicktime"]),
  },
} as const;

export type PlayerUpload = { path: string; url: string };

export async function uploadPlayerFile(
  bucket: "player-photos" | "player-videos",
  uid: string,
  file: File,
): Promise<PlayerUpload> {
  const rule = RULES[bucket];
  if (!rule.mime.has(file.type as never)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > rule.maxBytes) {
    throw new Error(`${bucket === "player-photos" ? "Photo" : "Video"} is too large`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${uid}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function playerStoragePath(bucket: "player-photos" | "player-videos", url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const start = url.indexOf(marker);
  const signedStart = url.indexOf(signedMarker);
  if (start >= 0) return decodeURIComponent(url.slice(start + marker.length).split("?")[0]);
  if (signedStart >= 0) return decodeURIComponent(url.slice(signedStart + signedMarker.length).split("?")[0]);
  return null;
}

export async function removePlayerFile(bucket: "player-photos" | "player-videos", path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
