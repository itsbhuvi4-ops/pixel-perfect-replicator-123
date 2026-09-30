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
  component: LoginPage,
});

function LoginPage() {
  const verify = useServerFn(verifyLogin);
  const navigate = useNavigate();
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
    navigate({ to: homeForRoles([role]) });
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-4xl">Login</h1>
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
        <button disabled={busy} className="label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
