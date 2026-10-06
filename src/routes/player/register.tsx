import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerPlayer } from "@/lib/accounts.functions";
import { GAME_ROLES, ROLE_LABELS, usernameToEmail } from "@/lib/format";
import { uploadPlayerFile } from "@/lib/storage";
import { errText } from "@/components/Guard";

export const Route = createFileRoute("/player/register")({
  head: () => ({
    meta: [
      { title: "Player Registration — BidX Auction" },
      { name: "description", content: "Register once to enter the auction player pool." },
      { property: "og:title", content: "Player Registration — BidX Auction" },
      { property: "og:description", content: "Register once to enter the auction pool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const register = useServerFn(registerPlayer);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    username: "", password: "", player_name: "", game_id: "", game_name: "",
    experience: "", team_name: "", uid: "", primary_role: "primary_rusher",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ data: { ...f, primary_role: f.primary_role as (typeof GAME_ROLES)[number] } });
      const { data: auth, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(f.username), password: f.password });
      if (error || !auth.user) throw error;
      toast.success("Registered — you're in the auction pool");
      navigate({ to: "/my-player" });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-canvas mx-auto max-w-3xl px-4 py-10">
      <section className="neo-panel bg-panel p-5 sm:p-8">
      <p className="selection-label w-fit bg-green px-3 py-1 text-xs">ENTER THE PLAYER POOL</p>
      <h1 className="mt-3 font-display text-5xl">Player Registration</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Username" value={f.username} onChange={set("username")} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_#.-]+" title="Use only letters, numbers, _, #, . and -" />
        <input className="field" type="password" placeholder="Password (8+)" value={f.password} onChange={set("password")} required minLength={8} />
        <input className="field" placeholder="Player name" value={f.player_name} onChange={set("player_name")} required />
        <input className="field" placeholder="Game ID" value={f.game_id} onChange={set("game_id")} required />
        <input className="field" placeholder="Game name / IGN" value={f.game_name} onChange={set("game_name")} required />
        <input className="field" placeholder="Gaming experience" value={f.experience} onChange={set("experience")} required />
        <input className="field" placeholder="Previous / current esports team" value={f.team_name} onChange={set("team_name")} required />
        <input className="field" placeholder="UID" value={f.uid} onChange={set("uid")} required />
        <select className="field" value={f.primary_role} onChange={set("primary_role")}>
          {GAME_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button disabled={busy} className="neo-action label-cond bg-gold py-3 text-[13px] text-arena disabled:opacity-50 sm:col-span-2">{busy ? "Registering…" : "Register"}</button>
      </form>
      </section>
    </main>
  );
}
