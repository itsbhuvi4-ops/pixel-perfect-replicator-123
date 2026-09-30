import { supabase } from "@/integrations/supabase/client";

/** Upload a file into a player-owned storage folder and return a long-lived signed URL. */
export async function uploadPlayerFile(bucket: string, uid: string, file: File): Promise<string> {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data, error: se } = await supabase.storage.from(bucket).createSignedUrl(path, 315360000);
  if (se) throw se;
  return data.signedUrl;
}
