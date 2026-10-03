import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth";

/** UI gate only — every action is re-checked by the server. */
export function RoleGate({ role, children }: { role: AppRole | AppRole[]; children: ReactNode }) {
  const { session, roles, loading } = useAuth();
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
  if (!roles.some((r) => allowed.includes(r))) return <Center>This page isn't available for your account.</Center>;
  return <>{children}</>;
}

export function Center({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center px-4 text-center text-mut">{<div>{children}</div>}</div>;
}

export function errText(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}
