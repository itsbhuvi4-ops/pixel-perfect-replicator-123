import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usernameToEmail } from "@/lib/format";
import { errText } from "@/components/Guard";

export const Route = createFileRoute("/change-password")({
  head: () => ({
    meta: [
      { title: "Change Password — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { session, username, loading } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", search: {} });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (!username) {
      toast.error("Unable to verify your account. Please sign in again.");
      return;
    }
    setBusy(true);
    try {
      // Verify the current password server-side before allowing the change.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password: current,
      });
      if (verifyError) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (session?.user.id) {
        await (supabase as any)
          .from("profiles")
          .update({ must_change_password: false, updated_at: new Date().toISOString() })
          .eq("id", session.user.id);
      }
      toast.success("Password changed");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="label-cond text-[11px] text-gold">SECURITY</div>
      <h1 className="mt-2 font-display text-5xl">Change Password</h1>
      <p className="mt-2 text-sm text-mut">
        Enter your current password, then choose a new one. Your password is never shown or stored in plain text.
      </p>
      <form onSubmit={submit} className="mt-6 grid gap-3">
        <input
          className="field"
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
        <input
          className="field"
          type="password"
          minLength={8}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <input
          className="field"
          type="password"
          minLength={8}
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button disabled={busy} className="label-cond bg-gold py-3 text-sm text-arena disabled:opacity-40">
          {busy ? "Saving…" : "Set new password"}
        </button>
      </form>
    </main>
  );
}
