import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AuctionState = Tables<"auction_state">;
export type Player = Tables<"players">;
export type Ambassador = Tables<"ambassadors">;
export type AuctionEvent = Tables<"auction_events">;

export function useAuctionState() {
  return useQuery({
    queryKey: ["auction_state"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auction_state")
        .select("*")
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
      const { data, error } = await supabase
        .from("players")
        .select("*")
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
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*")
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
      const { data, error } = await supabase
        .from("auction_events")
        .select("*")
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
      const { data, error } = await supabase
        .from("bids")
        .select("*")
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
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Player | null;
    },
  });
}

export function useMyAmbassador(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["my_ambassador", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassadors")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Ambassador | null;
    },
  });
}

export function useMyRoster(ambassadorId: string | null | undefined) {
  return useQuery({
    queryKey: ["my_roster", ambassadorId],
    enabled: !!ambassadorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
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
  useEffect(() => {
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["auction_state"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["ambassadors"] });
      qc.invalidateQueries({ queryKey: ["auction_events"] });
    };
    const channel = supabase
      .channel("auction-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "ambassadors" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_events" }, invalidate)
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", invalidate);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", invalidate);
    };
  }, [qc]);
}

export function minimumNextBid(state: AuctionState | null | undefined): number {
  if (!state) return 0;
  return state.current_bid === null ? state.base_price : state.current_bid + state.min_increment;
}
