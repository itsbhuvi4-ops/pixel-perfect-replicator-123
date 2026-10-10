import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { homeForRoles, type AppRole } from "@/lib/auth";
import { usernameToEmail } from "@/lib/format";
import { getFirstAdminSetupStatus, setupFirstAdmin, verifyLogin } from "@/lib/accounts.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Login — BIDXAUCTION" },
    { name: "description", content: "Secure BIDXAUCTION access for players, ambassadors, casters and admins." },
    { property: "og:title", content: "Login — BIDXAUCTION" },
    { property: "og:description", content: "One secure login for every auction role." },
    { property: "og:type", content: "website" },
  ] }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = s["next"];
    return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? { next } : {};
  },
  component: LoginPage,
});

function LoginPage() {
  const verify = useServerFn(verifyLogin);
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AppRole>("player");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setup, setSetup] = useState({ username: "", password: "", setupCode: "" });

  useEffect(() => {
    let cancelled = false;
    getFirstAdminSetupStatus().then((res) => { if (!cancelled) setSetupAvailable(res.available); })
      .catch(() => { if (!cancelled) setSetupAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  const submitFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setSetupBusy(true); setErr(null);
    try {
      await setupFirstAdmin({ data: setup });
      const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(setup.username), password: setup.password });
      if (error) throw error;
      window.location.href = "/admin";
    } catch (error) {
      setErr(error instanceof Error ? error.message : "First-admin setup failed");
    } finally { setSetupBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username.trim()), password });
    if (error) { setBusy(false); setErr("Incorrect username or password. Please try again."); return; }
    const res = await verify({ data: { role } });
    setBusy(false);
    if (!res.ok) { await supabase.auth.signOut(); setErr(res.error); return; }
    if (res.mustChangePassword) { window.location.href = "/change-password"; return; }
    if (next) { await navigate({ to: next }); return; }
    await navigate({ to: homeForRoles([role]) });
  };

  return (
    <main className="bidx-login min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <style>{`
        .bidx-login{position:relative;background:radial-gradient(ellipse at 78% 8%,rgba(7,88,78,.09),transparent 40%),var(--arena);color:var(--foreground)}
        .bidx-login-glow{position:absolute;width:24rem;height:24rem;border-radius:9999px;filter:blur(90px);pointer-events:none;opacity:.12}
        .bidx-login-glow-one{top:0;left:5%;background:#07584e}
        .bidx-login-glow-two{right:0;bottom:0;background:#b5b4a7}
        .bidx-login-art{background:radial-gradient(ellipse at 45% 15%,rgba(7,88,78,.10),transparent 45%),linear-gradient(155deg,#fffef0 0%,#f3f1e4 65%,#e9eadc 100%);color:#191916}
        .bidx-login-art:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 20%,rgba(7,88,78,.035) 50%,transparent 75%);background-size:200% 100%;animation:bidx-login-shimmer 8s ease-in-out infinite}
        .bidx-login-gradient-text{background:linear-gradient(100deg,#034b42 0%,#07584e 60%,#65968a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .bidx-login-input{width:100%;height:3.35rem;border:1px solid rgba(25,25,22,.16);border-radius:9999px;background:rgba(255,255,255,.62);padding:0 1.2rem;color:#191916;outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
        .bidx-login-input::placeholder{color:#77766b}
        .bidx-login-input:focus{border-color:rgba(7,88,78,.65);background:#fffefb;box-shadow:0 0 0 3px rgba(7,88,78,.09)}
        .bidx-login-input option{background:#fffef0;color:#191916}
        .bidx-login-submit{display:flex;align-items:center;justify-content:space-between;gap:1rem;width:100%;min-height:3.5rem;border-radius:9999px;padding:.75rem 1.25rem;background:linear-gradient(100deg,#07584e,#0b7163);color:#fffef0;font-size:.75rem;font-weight:800;letter-spacing:.1em;transition:transform .2s,filter .2s}
        .bidx-login-submit:hover{transform:translateY(-2px);filter:brightness(1.08)}
        .bidx-login-submit:disabled{opacity:.6;cursor:wait;transform:none}
        @keyframes bidx-login-shimmer{0%,100%{background-position:100% 0}50%{background-position:0 0}}
        @media(prefers-reduced-motion:reduce){.bidx-login-art:after{animation:none}.bidx-login-submit{transition:none}}
      `}</style>
      <div className="bidx-login-glow bidx-login-glow-one" aria-hidden="true" />
      <div className="bidx-login-glow bidx-login-glow-two" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[min(760px,calc(100vh-6rem))] max-w-6xl overflow-hidden rounded-[2rem] border border-[#07584e]/15 bg-[#fffef0]/95 shadow-[0_24px_80px_rgba(25,25,22,.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="bidx-login-art relative flex min-h-[15rem] flex-col justify-between overflow-hidden px-7 py-7 sm:px-10 sm:py-9 lg:min-h-[42rem] lg:px-12 lg:py-12">
          <div className="relative z-10 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl border border-[#07584e]/25 bg-[#07584e]/5 text-[#07584e] shadow-[0_0_30px_rgba(7,88,78,.08)]"><Zap className="size-6" /></div>
            <div><p className="text-sm font-black tracking-[.22em] text-[#191916]">BIDXAUCTION</p><p className="mt-1 text-[10px] tracking-[.16em] text-[#6f6e63]">THE ULTIMATE LIVE PLAYER AUCTION</p></div>
          </div>
          <div className="relative z-10 mt-10 max-w-lg lg:mt-0">
            <p className="mb-4 text-xs font-bold tracking-[.3em] text-[#07584e]">YOUR ARENA. YOUR MOMENT.</p>
            <h1 className="text-5xl font-black leading-[.98] tracking-[-.045em] text-[#191916] sm:text-6xl lg:text-7xl">THE NEXT<br /><span className="bidx-login-gradient-text">BIG MOVE</span><br />STARTS HERE.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#6f6e63]">Enter the arena and get ready for the live player auction experience.</p>
          </div>
          <div className="relative z-10 mt-9 flex items-center gap-2 text-xs text-[#6f6e63] lg:mt-0"><ShieldCheck className="size-4 text-[#07584e]" /> Secure access for every auction role</div>
        </section>

        <section className="relative flex flex-col justify-center px-6 py-9 sm:px-10 lg:px-12">
          <div className="pointer-events-none absolute right-0 top-0 size-64 rounded-full bg-[#07584e]/5 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold tracking-[.28em] text-[#07584e]">WELCOME BACK</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Sign in<span className="text-[#07584e]">.</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#6f6e63]">Use your registered username and password to continue.</p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-xs font-medium text-[#191916]">Username
                <input autoComplete="username" className="bidx-login-input" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium text-[#191916]">Password
                <span className="relative block">
                  <input autoComplete="current-password" className="bidx-login-input pr-12" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-3 grid place-items-center text-[#6f6e63] transition hover:text-[#07584e]">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                </span>
              </label>
              <label className="flex flex-col gap-2 text-xs font-medium text-[#191916]">Sign in as
                <select className="bidx-login-input" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
                  <option value="player">Player</option><option value="ambassador">Ambassador</option><option value="caster">Caster</option><option value="admin">Admin</option>
                </select>
              </label>
              {err && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-100 px-4 py-3 text-sm text-rose-700">{err}</p>}
              <button disabled={busy} className="bidx-login-submit mt-1">{busy ? "Signing in…" : "LOGIN TO BIDXAUCTION"}<span aria-hidden="true">→</span></button>
            </form>
            <p className="mt-5 text-center text-xs leading-5 text-[#6f6e63]">Having trouble signing in? Contact your BIDXAUCTION administrator.</p>

            {setupAvailable && <div className="mt-7 border-t border-[#07584e]/15 pt-5">
              <button type="button" onClick={() => setSetupOpen((v) => !v)} className="text-xs font-semibold text-[#07584e] hover:text-white">{setupOpen ? "Hide first-admin setup" : "First admin? Secure setup"}</button>
              {setupOpen && <form onSubmit={submitFirstAdmin} className="mt-4 grid gap-3">
                <p className="text-xs leading-5 text-[#6f6e63]">Available only while no admin account exists. The setup code is verified on the server.</p>
                <input className="bidx-login-input" placeholder="Admin username" value={setup.username} onChange={(e) => setSetup({ ...setup, username: e.target.value })} required minLength={3} />
                <input className="bidx-login-input" type="password" placeholder="Admin password (8+)" value={setup.password} onChange={(e) => setSetup({ ...setup, password: e.target.value })} required minLength={8} />
                <input className="bidx-login-input" type="password" placeholder="Private setup code" value={setup.setupCode} onChange={(e) => setSetup({ ...setup, setupCode: e.target.value })} required minLength={12} autoComplete="off" />
                <button disabled={setupBusy} className="bidx-login-submit">{setupBusy ? "Creating admin…" : "Create first admin"}<span>→</span></button>
              </form>}
            </div>}
          </div>
          <p className="relative mt-8 text-center text-[10px] tracking-[.12em] text-[#6f6e63]">BIDXAUCTION · BUILT FOR THE LIVE ARENA</p>
        </section>
      </div>
    </main>
  );
}
