import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

export type AuctionState = Tables<"auction_state">;
export type Player = Tables<"players">;
export type Ambassador = Tables<"ambassadors">;
export type AuctionEvent = Tables<"auction_events">;

export function useAuctionState() {
  return useQuery({
    queryKey: ["auction_state"],
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
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Player | null;
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

/** Subscribe once per page to keep every auction query in sync with the server. */
export function useRealtimeAuction() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const hasSession = Boolean(session?.user.id);

  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["auction_state"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["ambassadors"] });
      qc.invalidateQueries({ queryKey: ["auction_events"] });
      qc.invalidateQueries({ queryKey: ["bids"] });
    };

    // Public audience polling deliberately avoids subscribing to private table
    // rows over Postgres Changes. Authenticated roles keep the realtime channel.
    if (!hasSession) {
      const timer = window.setInterval(invalidate, 2000);
      invalidate();
      return () => window.clearInterval(timer);
    }

    const timer = window.setInterval(invalidate, 2000);
    invalidate();

    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", invalidate);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", invalidate);
    };
  }, [qc, hasSession]);
}

export function minimumNextBid(state: AuctionState | null | undefined): number {
  if (!state) return 0;
  return state.current_bid === null ? state.base_price : state.current_bid + state.min_increment;
}
