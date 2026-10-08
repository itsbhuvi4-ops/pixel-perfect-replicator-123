import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForRoles, type AppRole } from "@/lib/auth";
import { usernameToEmail } from "@/lib/format";
import { getFirstAdminSetupStatus, setupFirstAdmin, verifyLogin } from "@/lib/accounts.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — BidX Auction" },
      { name: "description", content: "Sign in as admin, caster, ambassador or player." },
      { property: "og:title", content: "Login — BidX Auction" },
      { property: "og:description", content: "One login for every auction role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined } => ({
    next: typeof s['next'] === "string" && s['next'].startsWith("/") && !s['next'].startsWith("//") ? s['next'] : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const verify = useServerFn(verifyLogin);
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("player");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setup, setSetup] = useState({ username: "", password: "", setupCode: "" });

  useEffect(() => {
    let cancelled = false;
    getFirstAdminSetupStatus()
      .then((res) => { if (!cancelled) setSetupAvailable(res.available); })
      .catch(() => { if (!cancelled) setSetupAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  const submitFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupBusy(true);
    setErr(null);
    try {
      await setupFirstAdmin({ data: setup });
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(setup.username),
        password: setup.password,
      });
      if (error) throw error;
      window.location.href = "/admin";
    } catch (error) {
      setErr(error instanceof Error ? error.message : "First-admin setup failed");
    } finally {
      setSetupBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) { setBusy(false); setErr("Wrong username or password"); return; }
    const res = await verify({ data: { role } });
    setBusy(false);
    if (!res.ok) { await supabase.auth.signOut(); setErr(res.error); return; }
    if (res.mustChangePassword) { window.location.href = "/change-password"; return; }
    // Keep the existing Supabase session in the SPA instead of forcing a full
    // browser reload. This makes successful login feel immediate.
    if (next) {
      await navigate({ to: next });
      return;
    }
    await navigate({ to: homeForRoles([role]) });
  };

  return (
    <main className="auth-canvas mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="auth-poster hidden min-h-[32rem] overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
        <div className="selection-label w-fit bg-blue px-4 py-2">ONE ARENA · FOUR ROLES</div>
        <div>
          <p className="label-cond text-sm">BIDX ACCESS</p>
          <h1 className="mt-3 font-display text-8xl leading-[0.82]">YOUR ROLE.<br />YOUR MOVE.</h1>
        </div>
        <div className="route-line" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <section className="neo-panel bg-panel p-5 sm:p-8">
      <p className="label-cond text-xs text-blue">SECURE ACCESS</p>
      <h1 className="mt-2 font-display text-5xl">Login</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select className="field" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
          <option value="admin">Admin</option><option value="ambassador">Ambassador</option>
          <option value="caster">Caster</option><option value="player">Player</option>
        </select>
        {err && <p className="text-sm text-alert">{err}</p>}
        <button disabled={busy} className="neo-action label-cond bg-gold py-3 text-[13px] text-arena disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>

      {setupAvailable && (
        <div className="mt-6 border-t border-line pt-5">
          <button type="button" onClick={() => setSetupOpen((v) => !v)} className="label-cond text-[11px] text-gold hover:text-foreground">
            {setupOpen ? "Hide first-admin setup" : "First admin? Secure setup"}
          </button>
          {setupOpen && (
            <form onSubmit={submitFirstAdmin} className="mt-3 grid gap-2">
              <p className="text-[11px] leading-5 text-mut">Available only while no admin account exists. The setup code is verified on the server and is never stored in browser code.</p>
              <input className="field" placeholder="Admin username" value={setup.username} onChange={(e) => setSetup({ ...setup, username: e.target.value })} required minLength={3} />
              <input className="field" type="password" placeholder="Admin password (8+)" value={setup.password} onChange={(e) => setSetup({ ...setup, password: e.target.value })} required minLength={8} />
              <input className="field" type="password" placeholder="Private setup code" value={setup.setupCode} onChange={(e) => setSetup({ ...setup, setupCode: e.target.value })} required minLength={12} autoComplete="off" />
              <button disabled={setupBusy} className="label-cond border border-gold/50 bg-gold/10 py-2.5 text-[12px] text-gold disabled:opacity-40">
                {setupBusy ? "Creating admin…" : "Create first admin"}
              </button>
            </form>
          )}
        </div>
      )}
      </section>
    </main>
  );
}
