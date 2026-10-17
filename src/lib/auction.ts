import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Some columns exist only in certain environments; keep them optional.
export type AuctionState = Tables<"auction_state"> & {
  caster_session_id?: string | null;
  bidding_deadline_at?: string | null;
  tournament_season?: string | null;
  tournament_logo_url?: string | null;
  auction_branding?: string | null;
};
export type Player = Tables<"players">;
export type Ambassador = Tables<"ambassadors">;
export type AuctionEvent = Tables<"auction_events">;

// Keep healthy auction queries fresh every 2 seconds. If a query is failing,
// back off to a maximum 30-second interval instead of hammering Supabase.
// React Query also stops interval refetches while the page is in the background.
const auctionPollingInterval = (query: { state: { status: string; fetchFailureCount: number } }) =>
  query.state.status === "error"
    ? Math.min(30_000, 2_000 * 2 ** Math.min(query.state.fetchFailureCount, 4))
    : 2_000;

const auctionQueryRecovery = {
  refetchInterval: auctionPollingInterval,
  refetchIntervalInBackground: false,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(30_000, 1_000 * 2 ** attempt),
};

export function useAuctionState() {
  return useQuery({
    queryKey: ["auction_state"],
    ...auctionQueryRecovery,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_auction_state")
        .select("id,status,current_player_id,current_bid,current_bidder_id,base_price,min_increment,lot_counter,max_players,max_ambassadors,max_casters,tournament_name,updated_at,default_starting_points,retain_price,max_retains,caster_cam_live,bidding_open,tournament_season,tournament_logo_url,auction_branding,caster_session_id")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as AuctionState | null;
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    ...auctionQueryRecovery,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_players")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Player[];
    },
  });
}

export function useAmbassadors() {
  return useQuery({
    queryKey: ["ambassadors"],
    ...auctionQueryRecovery,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_ambassadors")
        .order("remaining_points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ambassador[];
    },
  });
}

export function useAuctionEvents(limit = 25) {
  return useQuery({
    queryKey: ["auction_events", limit],
    ...auctionQueryRecovery,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_auction_events")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuctionEvent[];
    },
  });
}

export function useBids(playerId: string | null | undefined) {
  return useQuery({
    queryKey: ["bids", playerId],
    enabled: !!playerId,
    ...auctionQueryRecovery,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_bids")
        .eq("player_id", playerId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Tables<"bids">[];
    },
  });
}

export function useMyPlayer(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["my_player", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("player_get_me");
      if (!error) {
        return ((data ?? [])[0] ?? null) as Player | null;
      }

      // Fallback for deployments where the RPC migration has not reached the
      // live database yet. The query is scoped to the authenticated user.
      const { data: player, error: fallbackError } = await (supabase as any)
        .from("players")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (fallbackError) throw error;
      return (player ?? null) as Player | null;
    },
  });
}

export function useMyAmbassador(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["my_ambassador", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("ambassador_get_me");
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Ambassador | null;
    },
  });
}

export function useMyRoster(ambassadorId: string | null | undefined) {
  return useQuery({
    queryKey: ["my_roster", ambassadorId],
    enabled: !!ambassadorId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bidx_public_players")
        .select("*")
        .eq("ambassador_id", ambassadorId!)
        .order("sold_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Player[];
    },
  });
}

/** Invalidate mounted auction queries when the page returns to the foreground
 * or the network comes back. Individual queries own their polling/backoff timers.
 */
export function useRealtimeAuction() {
  const qc = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["auction_state"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["ambassadors"] });
      qc.invalidateQueries({ queryKey: ["auction_events"] });
      qc.invalidateQueries({ queryKey: ["bids"] });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };

    invalidate();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", invalidate);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", invalidate);
    };
  }, [qc]);
}

export function minimumNextBid(state: AuctionState | null | undefined): number {
  if (!state) return 0;
  return state.current_bid === null ? state.base_price : state.current_bid + state.min_increment;
}
