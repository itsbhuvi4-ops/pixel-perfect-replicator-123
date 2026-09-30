import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as money, r as initials } from "./format-Dl7fjJRF.mjs";
import { i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as useAuctionState, l as usePlayers, n as useAmbassadors, r as useAuctionEvents, t as minimumNextBid, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as PlayerStage, t as LiveTicker } from "./LiveTicker-DB9Eh8PD.mjs";
import { t as useCasterCamStream } from "./use-caster-cam-BQgylkGn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LiveAuction-pjiKuVRI.js
var import_jsx_runtime = require_jsx_runtime();
function TeamRail({ ambassadors, leaderId }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "label-cond text-[12px] text-mut",
				children: "Team Rail"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-mono text-[11px] text-mut",
				children: [ambassadors.length, " teams"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex flex-col gap-px",
			children: [ambassadors.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "py-2 font-mono text-[11px] text-mut",
				children: "No teams registered yet."
			}), ambassadors.map((amb) => {
				const leading = amb.id === leaderId;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: leading ? "flex items-center gap-3 rounded-xl bg-panel2 px-3 py-3 outline-1 -outline-offset-1 outline-gold/25" : "flex items-center gap-3 px-3 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: leading ? "grid size-8 place-items-center rounded-xl bg-gold/15 font-display text-sm text-gold ring-1 ring-gold/40" : "grid size-8 place-items-center rounded-xl bg-panel2 font-display text-sm ring-1 ring-line",
							children: initials(amb.team_name)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[13px]",
								children: amb.team_name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-[11px] text-mut",
								children: money(amb.remaining_points)
							})]
						}),
						leading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto font-mono text-[11px] text-gold",
							children: "LEAD"
						})
					]
				}, amb.id);
			})]
		})]
	});
}
function LiveAuction({ audience = false }) {
	useRealtimeAuction();
	const { data: state } = useAuctionState();
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: events = [] } = useAuctionEvents();
	const { stream: camStream } = useCasterCamStream(state?.caster_cam_live ?? false);
	const current = players.find((p) => p.id === state?.current_player_id) ?? null;
	const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
	const sold = players.filter((p) => p.status === "sold").length;
	const pool = players.filter((p) => p.status === "pool").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-7xl px-4 py-5 sm:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveTicker, { events }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-[1fr_320px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerStage, {
						player: current,
						state,
						camStream
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-panel p-4 ring-1 ring-line",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "label-cond text-[12px] text-mut",
									children: "Current Bid"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bid-flash font-display text-5xl text-gold",
									children: state?.current_bid ? money(state.current_bid) : "—"
								}, state?.current_bid ?? 0),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 font-mono text-[11px] text-mut",
									children: ["Next minimum ", money(minimumNextBid(state))]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-panel p-4 ring-1 ring-line",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "label-cond text-[12px] text-mut",
									children: "Highest Bidder"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-display text-4xl",
									children: leader?.team_name ?? "No bids yet"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 font-mono text-[11px] text-mut",
									children: [
										statusLabel(state?.status),
										" · ",
										sold,
										" sold · ",
										pool,
										" in pool"
									]
								})
							]
						})]
					}),
					audience ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] text-mut",
						children: "You're watching the live auction — no account needed. Bids appear instantly."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-3 text-[13px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/player/register",
							className: "label-cond border border-line bg-panel2 px-3 py-2 hover:text-gold",
							children: "Register as player"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auction",
							className: "label-cond border border-line bg-panel2 px-3 py-2 hover:text-gold",
							children: "Audience view"
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamRail, {
				ambassadors,
				leaderId: state?.current_bidder_id ?? null
			})]
		})]
	});
}
function statusLabel(s) {
	return s === "live" ? "LIVE" : s === "paused" ? "PAUSED" : s === "completed" ? "COMPLETED" : "NOT STARTED";
}
//#endregion
export { LiveAuction as t };
