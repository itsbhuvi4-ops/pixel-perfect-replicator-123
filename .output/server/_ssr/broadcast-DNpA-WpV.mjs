import { i as money, r as initials } from "./format-Dl7fjJRF.mjs";
import { i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as useAuctionState, l as usePlayers, n as useAmbassadors, r as useAuctionEvents, t as minimumNextBid, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as PlayerStage, t as LiveTicker } from "./LiveTicker-DB9Eh8PD.mjs";
import { t as useCasterCamStream } from "./use-caster-cam-BQgylkGn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/broadcast-DNpA-WpV.js
var import_jsx_runtime = require_jsx_runtime();
/**
* Broadcast View — clean fullscreen output for OBS / YouTube capture.
* No header, no navigation; everything on one screen, sized for 16:9.
*/
function BroadcastPage() {
	useRealtimeAuction();
	const { data: state } = useAuctionState();
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: events = [] } = useAuctionEvents();
	const { stream: camStream } = useCasterCamStream(state?.caster_cam_live ?? false);
	const current = players.find((p) => p.id === state?.current_player_id) ?? null;
	const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
	const sold = players.filter((p) => ["sold", "retained"].includes(p.status));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex h-screen min-h-0 flex-col gap-3 overflow-hidden p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4 border-b border-line pb-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-2xl tracking-wide",
						children: state?.tournament_name ?? "BIDX AUCTION"
					}),
					state?.status === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "label-cond flex items-center gap-1.5 bg-alert px-2 py-0.5 text-[12px] text-white",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "live-dot size-1.5 rounded-full bg-white" }), " LIVE"]
					}),
					state?.status === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-cond border border-line px-2 py-0.5 text-[12px] text-mut",
						children: "PAUSED"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "label-cond ml-auto font-mono text-[12px] text-mut",
						children: [
							"LOT ",
							current?.lot_number ?? "—",
							" · ",
							sold.length,
							" SOLD"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid min-h-0 flex-1 grid-cols-[1fr_260px] gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerStage, {
					player: current,
					state,
					camStream
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 flex-col gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Current Bid"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "bid-flash font-display text-4xl text-gold",
								children: state?.current_bid ? money(state.current_bid) : "—"
							}, state?.current_bid ?? 0),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: ["Next min ", money(minimumNextBid(state))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 border-t border-line pt-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "label-cond text-[12px] text-mut",
									children: "Highest Bidder"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display text-2xl",
									children: leader?.team_name ?? "—"
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-h-0 flex-1 overflow-hidden rounded-xl bg-panel p-3 ring-1 ring-line",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond mb-2 text-[12px] text-mut",
							children: "Leaderboard"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-1 overflow-hidden",
							children: [ambassadors.slice().sort((a, b) => b.remaining_points - a.remaining_points).slice(0, 8).map((amb) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: amb.id === state?.current_bidder_id ? "flex items-center gap-2 rounded-lg bg-panel2 px-2 py-1.5 outline-1 -outline-offset-1 outline-gold/40" : "flex items-center gap-2 px-2 py-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "grid size-6 shrink-0 place-items-center rounded-lg bg-panel2 font-display text-[11px] ring-1 ring-line",
										children: initials(amb.team_name)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "label-cond truncate text-[12px]",
										children: amb.team_name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-auto font-mono text-[11px] text-mut",
										children: money(amb.remaining_points)
									})
								]
							}, amb.id)), ambassadors.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[11px] text-mut",
								children: "No teams yet"
							})]
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveTicker, { events })
		]
	});
}
//#endregion
export { BroadcastPage as component };
