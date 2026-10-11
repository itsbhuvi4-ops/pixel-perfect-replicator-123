import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth";

/** UI gate only — every action is re-checked by the server. */
export function RoleGate({ role, children }: { role: AppRole | AppRole[]; children: ReactNode }) {
  const { session, roles, mustChangePassword, loading } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (loading) return <Center>Loading…</Center>;
  if (!session)
    return (
      <Center>
        <p>Please log in to continue.</p>
        <Link to="/login" search={{}} className="label-cond mt-4 inline-block bg-gold px-4 py-2 text-[12px] text-arena">
          Login
        </Link>
      </Center>
    );
  if (mustChangePassword) {
    return (
      <Center>
        <p>Your password must be changed before continuing.</p>
        <Link to="/change-password" className="label-cond mt-4 inline-block bg-gold px-4 py-2 text-[12px] text-arena">
          Change Password
        </Link>
      </Center>
    );
  }
  if (!roles.some((r) => allowed.includes(r))) return <Center>This page isn't available for your account.</Center>;
  return <>{children}</>;
}

export function Center({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center px-4 text-center text-mut">{<div>{children}</div>}</div>;
}

export function errText(e: unknown): string {
  const raw = e && typeof e === "object" && "message" in e
    ? String((e as { message: unknown }).message ?? "").trim()
    : "";
  if (!raw) return "Something went wrong. Please try again.";

  // Supabase/Postgres and server exceptions can contain schema names, SQL,
  // constraint details, request metadata, or stack traces. Do not display
  // those internals in a toast or page. Keep concise application messages
  // (for example, validation and auction-state errors) usable for the user.
  const internalError =
    raw.length > 220 ||
    /\n|\r|\bat\s+[^\s]+\s*\(|stack trace|sqlstate|postgres|postgrest|pgrst\d*|supabase|database error|relation .* does not exist|column .* does not exist|duplicate key value|violates .* constraint|permission denied for table|schema cache|invalid api key|jwt expired|authorization header/i.test(raw);
  if (internalError) return "Something went wrong. Please try again.";
  return raw;
}
