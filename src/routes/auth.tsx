import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { homeForRoles, useAuth } from "@/lib/auth";
import { usernameToEmail } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login — RA Auctions" },
      { name: "description", content: "Sign in as admin, caster, ambassador or player." },
      { property: "og:title", content: "Login — RA Auctions" },
      { property: "og:description", content: "One login for every auction role." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && !loading && roles.length) navigate({ to: homeForRoles(roles), replace: true });
  }, [session, roles, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    setBusy(false);
    if (error) setErr("Wrong username or password");
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-4xl">Login</h1>
      <p className="mt-1 text-sm text-mut">Admins, casters, ambassadors and players use the same login.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {err && <p className="text-sm text-alert">{err}</p>}
        <button disabled={busy} className="label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-mut">
        Forgot your password? Ask the tournament admin to reset it.
      </p>
      <p className="mt-2 text-sm text-mut">
        New player? <Link to="/register" className="text-gold">Register here</Link>
      </p>
    </main>
  );
}
