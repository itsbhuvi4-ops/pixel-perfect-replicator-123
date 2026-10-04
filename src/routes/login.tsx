import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForRoles, type AppRole } from "@/lib/auth";
import { usernameToEmail } from "@/lib/format";
import { adminExists, verifyLogin } from "@/lib/accounts.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — BidX Auction" },
      { name: "description", content: "Sign in as admin, caster, ambassador or player." },
      { property: "og:title", content: "Login — BidX Auction" },
      { property: "og:description", content: "One login for every auction role." },
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
  const { data: adminState } = useQuery({
    queryKey: ["admin_exists"],
    queryFn: useServerFn(adminExists),
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("player");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) { setBusy(false); setErr("Wrong username or password"); return; }
    const res = await verify({ data: { role } });
    setBusy(false);
    if (!res.ok) { await supabase.auth.signOut(); setErr(res.error); return; }
    if (next) { window.location.href = next; return; }
    window.location.href = homeForRoles([role]);
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
      {adminState && !adminState.exists && (
        <p className="mt-4 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-gold">
          No admin exists yet.{" "}
          <Link to="/setup" className="underline">
            Run the first-time setup
          </Link>{" "}
          to create one.
        </p>
      )}
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
      </section>
    </main>
  );
}
