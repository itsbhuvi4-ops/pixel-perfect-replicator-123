import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerPlayer } from "@/lib/accounts.functions";
import { GAME_ROLES, ROLE_LABELS, usernameToEmail } from "@/lib/format";
import { errText } from "@/components/Guard";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Player Registration — RA Auctions" },
      { name: "description", content: "Register once to enter the esports auction player pool." },
      { property: "og:title", content: "Player Registration — RA Auctions" },
      { property: "og:description", content: "Register once to enter the auction pool." },
    ],
  }),
  component: RegisterPage,
});

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadMedia(bucket: "player-photos" | "player-videos", uid: string, file: File) {
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: se } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (se) throw se;
  return data.signedUrl;
}

function RegisterPage() {
  const register = useServerFn(registerPlayer);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    username: "", password: "", player_name: "", ingame_name: "", game_id: "",
    primary_role: "primary_rusher", secondary_role: "", info: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photo && photo.size > 10 * 1024 * 1024) { toast.error("Photo must be under 10 MB"); return; }
    if (video && video.size > 200 * 1024 * 1024) { toast.error("Video must be under 200 MB"); return; }
    setBusy(true);
    try {
      await register({
        data: {
          ...f,
          primary_role: f.primary_role as (typeof GAME_ROLES)[number],
          secondary_role: (f.secondary_role || null) as (typeof GAME_ROLES)[number] | null,
        },
      });
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(f.username), password: f.password,
      });
      if (error || !auth.user) throw error;
      const uid = auth.user.id;
      const patch: { photo_url?: string; video_url?: string } = {};
      if (photo) patch.photo_url = await uploadMedia("player-photos", uid, photo);
      if (video) patch.video_url = await uploadMedia("player-videos", uid, video);
      if (Object.keys(patch).length) await supabase.from("players").update(patch).eq("user_id", uid);
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
      <p className="mt-1 text-sm text-mut">One-time registration. You'll enter the auction pool automatically.</p>
      <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Username" value={f.username} onChange={set("username")} required />
        <input className="field" type="password" placeholder="Password (8+ characters)" value={f.password} onChange={set("password")} required minLength={8} />
        <input className="field" placeholder="Full name" value={f.player_name} onChange={set("player_name")} required />
        <input className="field" placeholder="In-game name" value={f.ingame_name} onChange={set("ingame_name")} required />
        <input className="field sm:col-span-2" placeholder="Game ID" value={f.game_id} onChange={set("game_id")} required />
        <label className="text-xs text-mut">Primary role
          <select className="field mt-1 w-full" value={f.primary_role} onChange={set("primary_role")}>
            {GAME_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <label className="text-xs text-mut">Secondary role
          <select className="field mt-1 w-full" value={f.secondary_role} onChange={set("secondary_role")}>
            <option value="">None</option>
            {GAME_ROLES.filter((r) => r !== f.primary_role).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
        <textarea className="field sm:col-span-2" rows={3} placeholder="About you" value={f.info} onChange={set("info")} maxLength={500} />
        <label className="text-xs text-mut">Profile photo
          <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="text-xs text-mut">Gameplay video (locked after upload)
          <input type="file" accept="video/*" className="mt-1 block w-full text-xs" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
        </label>
        <button disabled={busy} className="label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50 sm:col-span-2">
          {busy ? "Registering…" : "Register"}
        </button>
      </form>
    </main>
  );
}
