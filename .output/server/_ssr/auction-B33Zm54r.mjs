import { n as __toESM } from "../_runtime.mjs";
import { a as require_react, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auction-B33Zm54r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useAuctionState() {
	return useQuery({
		queryKey: ["auction_state"],
		queryFn: async () => {
			const { data, error } = await supabase.from("auction_state").select("*").eq("id", 1).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
}
function usePlayers() {
	return useQuery({
		queryKey: ["players"],
		queryFn: async () => {
			const { data, error } = await supabase.from("players").select("*").order("created_at", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
}
function useAmbassadors() {
	return useQuery({
		queryKey: ["ambassadors"],
		queryFn: async () => {
			const { data, error } = await supabase.from("ambassadors").select("*").order("remaining_points", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
}
function useAuctionEvents(limit = 25) {
	return useQuery({
		queryKey: ["auction_events", limit],
		queryFn: async () => {
			const { data, error } = await supabase.from("auction_events").select("*").order("created_at", { ascending: false }).limit(limit);
			if (error) throw error;
			return data ?? [];
		}
	});
}
function useBids(playerId) {
	return useQuery({
		queryKey: ["bids", playerId],
		enabled: !!playerId,
		queryFn: async () => {
			const { data, error } = await supabase.from("bids").select("*").eq("player_id", playerId).order("created_at", { ascending: false }).limit(30);
			if (error) throw error;
			return data ?? [];
		}
	});
}
function useMyPlayer(userId) {
	return useQuery({
		queryKey: ["my_player", userId],
		enabled: !!userId,
		queryFn: async () => {
			const { data, error } = await supabase.from("players").select("*").eq("user_id", userId).maybeSingle();
			if (error) throw error;
			return data ?? null;
		}
	});
}
function useMyAmbassador(userId) {
	return useQuery({
		queryKey: ["my_ambassador", userId],
		enabled: !!userId,
		queryFn: async () => {
			const { data, error } = await supabase.from("ambassadors").select("*").eq("user_id", userId).maybeSingle();
			if (error) throw error;
			return data ?? null;
		}
	});
}
function useMyRoster(ambassadorId) {
	return useQuery({
		queryKey: ["my_roster", ambassadorId],
		enabled: !!ambassadorId,
		queryFn: async () => {
			const { data, error } = await supabase.from("players").select("*").eq("ambassador_id", ambassadorId).order("sold_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
}
/** Subscribe once per page to keep every auction query in sync with the server. */
function useRealtimeAuction() {
	const qc = useQueryClient();
	(0, import_react.useEffect)(() => {
		const invalidate = () => {
			qc.invalidateQueries({ queryKey: ["auction_state"] });
			qc.invalidateQueries({ queryKey: ["players"] });
			qc.invalidateQueries({ queryKey: ["ambassadors"] });
			qc.invalidateQueries({ queryKey: ["auction_events"] });
		};
		const channel = supabase.channel("auction-sync").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "auction_state"
		}, invalidate).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "players"
		}, invalidate).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "ambassadors"
		}, invalidate).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "bids"
		}, invalidate).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "auction_events"
		}, invalidate).subscribe();
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
function minimumNextBid(state) {
	if (!state) return 0;
	return state.current_bid === null ? state.base_price : state.current_bid + state.min_increment;
}
//#endregion
export { useBids as a, useMyRoster as c, useAuctionState as i, usePlayers as l, useAmbassadors as n, useMyAmbassador as o, useAuctionEvents as r, useMyPlayer as s, minimumNextBid as t, useRealtimeAuction as u };
