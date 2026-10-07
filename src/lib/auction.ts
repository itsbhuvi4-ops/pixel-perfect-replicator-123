import { useQuery } from "convex/react";
import { useAuth } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";

export type AuctionState = {
  id: string;
  status: "not_started" | "live" | "paused" | "completed" | "stopped";
  current_player_id: string | null;
  current_bid: number | null;
  current_bidder_id: string | null;
  base_price: number;
  min_increment: number;
  lot_counter: number;
  max_players: number;
  max_ambassadors: number;
  max_casters: number;
  tournament_name?: string | null;
  tournament_season?: string | null;
  default_starting_points: number;
  retain_price: number;
  max_retains: number;
  caster_cam_live: boolean;
  bidding_open: boolean;
  bidding_deadline_at?: number | null;
  updated_at: number;
  caster_session_id?: string | null;
};

export type Player = {
  id: string;
  player_name: string;
  ingame_name: string;
  game_id: string;
  primary_role: string;
  secondary_role?: string | null;
  info?: string | null;
  experience?: string | null;
  team_name?: string | null;
  status: string;
  sold_price?: number | null;
  ambassador_id?: string | null;
  sold_at?: number | null;
  lot_number?: number | null;
  created_at: number;
  updated_at: number;
  photo_url?: string | null;
  video_url?: string | null;
};

export type Ambassador = {
  id: string;
  ambassador_name: string;
  team_name: string;
  starting_points: number;
  remaining_points: number;
  info?: string | null;
};

export type AuctionEvent = {
  id: string;
  event_type: string;
  message: string;
  player_id?: string | null;
  ambassador_id?: string | null;
  amount?: number | null;
  created_at: number;
};

export type Bid = {
  id: string;
  player_id: string;
  ambassador_id: string;
  amount: number;
  created_at: number;
};

export function useAuctionState() {
  const data = useQuery(convexApi.auction.publicState);
  return { data: (data ?? null) as AuctionState | null, isLoading: data === undefined };
}

export function usePlayers() {
  const data = useQuery(convexApi.players.listPublic);
  return { data: (data ?? []) as Player[], isLoading: data === undefined };
}

export function useAmbassadors() {
  const data = useQuery(convexApi.ambassadors.publicList);
  return { data: (data ?? []) as Ambassador[], isLoading: data === undefined };
}

export function useAuctionEvents(limit = 25) {
  const data = useQuery(convexApi.auction.publicEvents, { limit });
  return { data: (data ?? []) as AuctionEvent[], isLoading: data === undefined };
}

export function useBids(playerId: string | null | undefined) {
  const data = useQuery(convexApi.auction.publicBids, playerId ? { playerId } : "skip");
  return { data: (data ?? []) as Bid[], isLoading: data === undefined };
}

export function useMyPlayer(_userId: string | null | undefined) {
  const { session } = useAuth();
  const data = useQuery(convexApi.players.mine, session ? {} : "skip");
  return { data: (data ?? null) as Player | null, isLoading: data === undefined };
}

export function useMyAmbassador(_userId: string | null | undefined) {
  const { session } = useAuth();
  const data = useQuery(convexApi.ambassadors.mine, session ? {} : "skip");
  const profile = data && "players" in data ? data : data;
  return { data: (profile ?? null) as Ambassador | null, isLoading: data === undefined };
}

export function useMyRoster(ambassadorId: string | null | undefined) {
  const data = useQuery(convexApi.ambassadors.roster, ambassadorId ? { ambassadorId } : "skip");
  return { data: (data ?? []) as Player[], isLoading: data === undefined };
}

export function useRealtimeAuction() {
  // Convex subscriptions are reactive over WebSocket; no polling/invalidation loop is needed.
}

export function minimumNextBid(state: AuctionState | null | undefined): number {
  if (!state) return 0;
  return state.current_bid === null ? state.base_price : state.current_bid + state.min_increment;
}
