import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
export function RoleGate({ role, children }: { role: AppRole; children: React.ReactNode }) { const { session, roles, loading }=useAuth(); const navigate=useNavigate(); useEffect(()=>{ if(!loading&&!session) navigate({to:"/login"}); else if(!loading&&session&&!roles.includes(role)) navigate({to:"/"}); },[loading,session,roles,role,navigate]); if(loading||!session||!roles.includes(role)) return <div className="min-h-[70vh] grid place-items-center text-sm text-mut">Checking access…</div>; return <>{children}</>; }
