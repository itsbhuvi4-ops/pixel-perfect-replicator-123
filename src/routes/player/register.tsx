import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerPlayer } from "@/lib/accounts.functions";
import { GAME_ROLES, ROLE_LABELS, usernameToEmail } from "@/lib/format";
import { errText } from "@/components/Guard";

export const Route = createFileRoute("/player/register")({
  head: () => ({
    meta: [
      { title: "Player Registration — RA Auctions" },
      { name: "description", content: "Register once to enter the auction player pool." },
      { property: "og:title", content: "Player Registration — RA Auctions" },
      { property: "og:description", content: "Register once to enter the auction pool." },
    ],
  }),
  component: RegisterPage,
});

async function upload(bucket: string, uid: string, file: File) {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data, error: se } = await supabase.storage.from(bucket).createSignedUrl(path, 315360000);
  if (se) throw se;
  return data.signedUrl;
}

function RegisterPage() {
  const register = useServerFn(registerPlayer);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ username: "", password: "", player_name: "", uid: "", game_name: "", primary_role: "primary_rusher" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ data: { ...f, primary_role: f.primary_role as (typeof GAME_ROLES)[number] } });
      const { data: auth, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(f.username), password: f.password });
      if (error || !auth.user) throw error;
      const patch: { photo_url?: string; video_url?: string } = {};
      if (photo) patch.photo_url = await upload("player-photos", auth.user.id, photo);
      if (video) patch.video_url = await upload("player-videos", auth.user.id, video);
      if (Object.keys(patch).length) await supabase.from("players").update(patch).eq("user_id", auth.user.id);
      toast.success("Registered — you're in the auction pool");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl">Player Registration</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Username" value={f.username} onChange={set("username")} required />
        <input className="field" type="password" placeholder="Password (8+)" value={f.password} onChange={set("password")} required minLength={8} />
        <input className="field" placeholder="Player name" value={f.player_name} onChange={set("player_name")} required />
        <input className="field" placeholder="UID" value={f.uid} onChange={set("uid")} required />
        <input className="field" placeholder="Game name" value={f.game_name} onChange={set("game_name")} required />
        <select className="field" value={f.primary_role} onChange={set("primary_role")}>
          {GAME_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <label className="text-xs text-mut">Photo<input type="file" accept="image/*" className="mt-1 block w-full" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        <label className="text-xs text-mut">Video (locked after upload)<input type="file" accept="video/*" className="mt-1 block w-full" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /></label>
        <button disabled={busy} className="label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50 sm:col-span-2">{busy ? "Registering…" : "Register"}</button>
      </form>
    </main>
  );
}
