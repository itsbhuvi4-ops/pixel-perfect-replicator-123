import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { supabase } from "@/integrations/supabase/client";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!url) throw new Error("VITE_CONVEX_URL is required for the Convex migration build");

const convex = new ConvexReactClient(url);

function useSupabaseConvexAuth() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    if (!session) return null;
    if (!forceRefreshToken) return session.access_token;
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }, [session]);

  return useMemo(() => ({
    isLoading: loading,
    isAuthenticated: Boolean(session),
    fetchAccessToken,
  }), [loading, session, fetchAccessToken]);
}

export function ConvexAuthBridge({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
