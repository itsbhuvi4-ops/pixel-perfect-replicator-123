import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerPlayer } from "@/lib/accounts.functions";
import { GAME_ROLES, ROLE_LABELS, usernameToEmail } from "@/lib/format";
import { errText } from "@/components/Guard";

export const Route = createFileRoute("/player/register")({
  head: () => ({
    meta: [
      { title: "Player Registration — BIDXAUCTION" },
      { name: "description", content: "Register once to enter the BIDXAUCTION auction player pool." },
      { property: "og:title", content: "Player Registration — BIDXAUCTION" },
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="bidx-register min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <style>{`
        .bidx-register{position:relative;background:radial-gradient(ellipse at 78% 8%,rgba(7,88,78,.08),transparent 40%),var(--arena);color:var(--foreground)}
        .bidx-register-art{position:relative;background:radial-gradient(ellipse at 45% 15%,rgba(7,88,78,.09),transparent 45%),linear-gradient(155deg,#fffef0 0%,#f3f1e4 65%,#e9eadc 100%);color:#191916}
        .bidx-register-art:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 20%,rgba(7,88,78,.035) 50%,transparent 75%);background-size:200% 100%;animation:bidx-register-shimmer 8s ease-in-out infinite}
        .bidx-register-input{width:100%;min-height:3.25rem;border:1px solid rgba(25,25,22,.16);border-radius:9999px;background:rgba(255,255,255,.62);padding:.8rem 1.15rem;color:#191916;outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
        .bidx-register-input::placeholder{color:#77766b}
        .bidx-register-input:focus{border-color:rgba(7,88,78,.65);background:#fffefb;box-shadow:0 0 0 3px rgba(7,88,78,.09)}
        .bidx-register-input option{background:#fffef0;color:#191916}
        .bidx-register-submit{display:flex;align-items:center;justify-content:space-between;gap:1rem;width:100%;min-height:3.5rem;border-radius:9999px;padding:.75rem 1.25rem;background:linear-gradient(100deg,#07584e,#0b7163);color:#fffef0;font-size:.75rem;font-weight:800;letter-spacing:.1em;transition:transform .2s,filter .2s}
        .bidx-register-submit:hover{transform:translateY(-2px);filter:brightness(1.08)}
        .bidx-register-submit:disabled{opacity:.6;cursor:wait;transform:none}
        @keyframes bidx-register-shimmer{0%,100%{background-position:100% 0}50%{background-position:0 0}}
        @media(prefers-reduced-motion:reduce){.bidx-register-art:after{animation:none}.bidx-register-submit{transition:none}}
      `}</style>
      <div className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-[#07584e]/15 bg-[#fffef0]/95 shadow-[0_24px_80px_rgba(25,25,22,.12)] backdrop-blur-xl lg:grid-cols-[.78fr_1.22fr]">
        <aside className="bidx-register-art flex min-h-[17rem] flex-col justify-between overflow-hidden px-7 py-7 sm:px-10 sm:py-9 lg:min-h-[44rem] lg:px-12 lg:py-12">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl border border-[#07584e]/25 bg-[#07584e]/5 text-[#07584e]"><Zap className="size-6" /></div>
            <div><p className="text-sm font-black tracking-[.22em] text-[#191916]">BIDXAUCTION</p><p className="mt-1 text-[10px] tracking-[.16em] text-[#6f6e63]">THE ULTIMATE LIVE PLAYER AUCTION</p></div>
          </div>
          <div className="relative z-10 mt-9 max-w-lg lg:mt-0">
            <p className="mb-4 text-xs font-bold tracking-[.3em] text-[#07584e]">YOUR NEXT CHAPTER</p>
            <h1 className="text-5xl font-black leading-[.98] tracking-[-.045em] text-[#191916] sm:text-6xl lg:text-7xl">CLAIM YOUR<br /><span className="text-[#07584e]">PLACE IN<br />THE ARENA.</span></h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#6f6e63]">Create your player profile and get ready for the live auction. Your journey starts here.</p>
          </div>
          <div className="relative z-10 mt-8 flex items-center gap-2 text-xs text-[#6f6e63] lg:mt-0"><ShieldCheck className="size-4 text-[#07584e]" /> One secure registration for your player profile</div>
        </aside>
        <section className="min-w-0 px-6 py-9 sm:px-10 lg:px-12 lg:py-12">
          <div>
            <p className="text-[11px] font-bold tracking-[.28em] text-[#07584e]">PLAYER REGISTRATION</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#191916] sm:text-5xl">Join the pool<span className="text-[#07584e]">.</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#6f6e63]">Enter your account and player details below.</p>
            <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Username
                <input autoComplete="username" className="bidx-register-input" placeholder="Choose a username" value={f.username} onChange={set("username")} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_#.-]+" title="Use only letters, numbers, _, #, . and -" />
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Password
                <span className="relative block"><input autoComplete="new-password" className="bidx-register-input pr-12" type={showPassword ? "text" : "password"} placeholder="Create a password (8+)" value={f.password} onChange={set("password")} required minLength={8} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-3 grid place-items-center text-[#6f6e63] transition hover:text-[#07584e]">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span>
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Player name<input className="bidx-register-input" placeholder="Your display name" value={f.player_name} onChange={set("player_name")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Game ID<input className="bidx-register-input" placeholder="Your game ID" value={f.game_id} onChange={set("game_id")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Game name / IGN<input className="bidx-register-input" placeholder="In-game name" value={f.game_name} onChange={set("game_name")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Gaming experience<input className="bidx-register-input" placeholder="Years / experience" value={f.experience} onChange={set("experience")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">Previous / current esports team<input className="bidx-register-input" placeholder="Team name" value={f.team_name} onChange={set("team_name")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916]">UID<input className="bidx-register-input" placeholder="Your player UID" value={f.uid} onChange={set("uid")} required /></label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-[#191916] sm:col-span-2">Primary role
                <select className="bidx-register-input" value={f.primary_role} onChange={set("primary_role")}>{GAME_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
              </label>
              <button disabled={busy} className="bidx-register-submit mt-1 sm:col-span-2">{busy ? "Registering…" : "CREATE PLAYER ACCOUNT"}<span aria-hidden="true">→</span></button>
            </form>
            <p className="mt-5 text-center text-xs text-[#6f6e63]">Already registered? <a className="font-semibold text-[#07584e] underline-offset-4 hover:underline" href="/login">Sign in</a></p>
          </div>
          <p className="mt-8 text-center text-[10px] tracking-[.12em] text-[#6f6e63]">BIDXAUCTION · BUILT FOR THE LIVE ARENA</p>
        </section>
      </div>
    </main>
  );
}
