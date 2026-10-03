import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adminExists, bootstrapAdmin } from "@/lib/accounts.functions";
import { Center, errText } from "@/components/Guard";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "First Admin Setup — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const exists = useQuery({ queryKey: ["admin_exists"], queryFn: useServerFn(adminExists) });
  if (exists.isLoading) return <Center>Loading…</Center>;
  if (exists.data?.exists) return <AlreadySetup />;
  return <SetupForm />;
}

function AlreadySetup() {
  return (
    <Center>
      <div>
        <h1 className="font-display text-4xl">Setup complete</h1>
        <p className="mt-3 text-mut">An admin account already exists for this auction.</p>
        <Link to="/login" search={{}} className="label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena">
          Go to login
        </Link>
      </div>
    </Center>
  );
}

function SetupForm() {
  const bootstrap = useServerFn(bootstrapAdmin);
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await bootstrap({ data: { username, password } });
      await qc.invalidateQueries({ queryKey: ["admin_exists"] });
      setDone(true);
      toast.success("Admin created — sign in to finish the setup");
    } catch (e2) {
      setErr(errText(e2));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Center>
        <div>
          <h1 className="font-display text-4xl">Admin created</h1>
          <p className="mt-3 text-mut">
            Sign in as <span className="text-gold">{username}</span> with the Admin role, then open
            the Admin panel to seed ambassador and caster accounts.
          </p>
          <Link to="/login" search={{}} className="label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena">
            Go to login
          </Link>
        </div>
      </Center>
    );

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-4xl">First Admin Setup</h1>
      <p className="mt-2 text-sm text-mut">
        This screen works only while the auction has no admin. The account you create here owns the
        whole event: teams, casters, players and auction settings.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input className="field" placeholder="Admin username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        <input className="field" type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <input className="field" type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
        {err && <p className="text-sm text-alert">{err}</p>}
        <button disabled={busy} className="label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50">
          {busy ? "Creating…" : "Create admin account"}
        </button>
        <Link to="/login" search={{}} className="label-cond mt-2 text-center text-[12px] text-mut hover:text-gold">
          I already have an account
        </Link>
      </form>
    </main>
  );
}
