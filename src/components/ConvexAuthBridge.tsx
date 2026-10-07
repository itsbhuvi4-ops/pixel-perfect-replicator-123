import { useCallback, useMemo, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!url) throw new Error("VITE_CONVEX_URL is required for the Convex migration build");

const convex = new ConvexReactClient(url);

function useSupabaseConvexAuth() {
  const { session, loading } = useAuth();

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
