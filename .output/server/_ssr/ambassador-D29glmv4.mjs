import { n as __toESM } from "../_runtime.mjs";
import { a as plainPoints, i as money, n as ROLE_LABELS } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { r as useAuth } from "./auth-CNQtMrhD.mjs";
import { a as useBids, c as useMyRoster, i as useAuctionState, l as usePlayers, n as useAmbassadors, o as useMyAmbassador, r as useAuctionEvents, t as minimumNextBid, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as RoleGate, r as errText, t as Center } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as PlayerStage, t as LiveTicker } from "./LiveTicker-DB9Eh8PD.mjs";
import { t as useCasterCamStream } from "./use-caster-cam-BQgylkGn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ambassador-D29glmv4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AmbassadorConsole() {
	const { user } = useAuth();
	useRealtimeAuction();
	const { data: state } = useAuctionState();
	const { data: me } = useMyAmbassador(user?.id);
	const { data: roster = [] } = useMyRoster(me?.id);
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: events = [] } = useAuctionEvents();
	const { stream: camStream } = useCasterCamStream(state?.caster_cam_live ?? false);
	const current = players.find((p) => p.id === state?.current_player_id) ?? null;
	const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
	const iLead = !!me && state?.current_bidder_id === me.id;
	const rank = ambassadors.slice().sort((a, b) => b.remaining_points - a.remaining_points).findIndex((a) => a.id === me?.id) + 1;
	if (!me) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No ambassador profile is linked to this account. Ask the admin to create your team." }) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-7xl px-4 py-5 sm:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveTicker, { events }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-[1fr_340px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-4 sm:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "My Points",
								value: plainPoints(me.remaining_points),
								gold: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Rank",
								value: `#${rank || "—"} / ${ambassadors.length}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Roster",
								value: `${roster.length} players`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Lot",
								value: current ? `#${current.lot_number ?? "—"}` : "—"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerStage, {
						player: current,
						state,
						camStream
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BidPanel, {})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl bg-panel p-4 ring-1 ring-line",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond text-[12px] text-mut",
							children: "Current Lot"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 font-display text-3xl",
							children: current?.ingame_name ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 font-mono text-[11px] text-mut",
							children: state?.current_bid ? iLead ? `You lead with ${money(state.current_bid)}` : `${leader?.team_name ?? "Someone"} leads ${money(state.current_bid)}` : `Base price ${money(state?.base_price ?? 0)}`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 font-mono text-[11px]",
							children: iLead ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sold",
								children: "★ You are the highest bidder"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-mut",
								children: ["Next min ", money(minimumNextBid(state))]
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RosterPanel, { roster })]
			})]
		})]
	});
}
function Stat({ label, value, gold }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rounded-xl p-4 ring-1 ${gold ? "bg-gold/10 ring-gold/40" : "bg-panel ring-line"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "label-cond text-[12px] text-mut",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `font-display text-3xl ${gold ? "text-gold" : ""}`,
			children: value
		})]
	});
}
function BidPanel() {
	const qc = useQueryClient();
	const { user } = useAuth();
	const { data: state } = useAuctionState();
	const { data: me } = useMyAmbassador(user?.id);
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: bids = [] } = useBids(state?.current_player_id);
	const { data: roster = [] } = useMyRoster(me?.id);
	const [custom, setCustom] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const live = state?.status === "live" && !!state?.current_player_id;
	const minNext = minimumNextBid(state);
	const inc = state?.min_increment ?? 0;
	const retainCount = roster.filter((p) => p.status === "retained").length;
	const retainsLeft = Math.max(0, (state?.max_retains ?? 1) - retainCount);
	const canRetain = live && state?.current_bid === null && !!me && retainsLeft > 0;
	const affordable = !!me && minNext <= me.remaining_points;
	const teamName = (id) => ambassadors.find((a) => a.id === id)?.team_name ?? "—";
	const call = async (invoke, okMsg) => {
		if (!user) return;
		setBusy(true);
		try {
			const { error } = await invoke();
			if (error) throw error;
			toast.success(okMsg);
			setCustom("");
			await qc.invalidateQueries({ queryKey: ["auction_state"] });
			await qc.invalidateQueries({ queryKey: ["bids"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	const bid = (amount) => void call(() => supabase.rpc("place_bid_v3", {
		p_amount: amount,
		p_idempotency_key: crypto.randomUUID()
	}), `Bid of ${money(amount)} placed`);
	const customBid = () => {
		const n = Number(custom.replace(/[^0-9]/g, ""));
		if (!n) {
			toast.error("Enter a valid amount");
			return;
		}
		bid(n);
	};
	const steps = [
		minNext,
		minNext + inc,
		minNext + 2 * inc
	].filter((v, i, a) => a.indexOf(v) === i);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "label-cond text-[12px] text-mut",
					children: "Bid Control"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-mono text-[11px] text-mut",
					children: live ? `${bids.length} bids this lot` : "Waiting for a lot"
				})]
			}),
			!live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-mut",
				children: state?.status === "paused" ? "Auction is paused — bidding is locked." : "Bidding opens when the caster puts a player on the block."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex flex-wrap gap-2",
					children: steps.map((amount, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy || !me || amount > (me?.remaining_points ?? 0),
						onClick: () => bid(amount),
						className: i === 0 ? "label-cond bg-gold px-4 py-2 text-[13px] text-arena transition-opacity hover:opacity-90 disabled:opacity-40" : "label-cond border border-gold/40 bg-gold/10 px-3 py-2 text-[12px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-40",
						children: i === 0 ? `Bid ${plainPoints(amount)}` : `+${plainPoints(amount - (state?.current_bid ?? 0))}`
					}, amount))
				}),
				!affordable && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-[12px] text-alert",
					children: [
						"You need ",
						plainPoints(minNext),
						" points to bid next — you have ",
						plainPoints(me?.remaining_points ?? 0),
						"."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field flex-1",
						inputMode: "numeric",
						placeholder: `Custom amount ≥ ${plainPoints(minNext)}`,
						value: custom,
						onChange: (e) => setCustom(e.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy || !me || !custom,
						onClick: customBid,
						className: "label-cond border border-line bg-panel2 px-4 py-2 text-[12px] text-mut hover:text-foreground disabled:opacity-40",
						children: "Place"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center justify-between border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[11px] text-mut",
						children: retainsLeft > 0 ? `Retain (${retainsLeft} left) — only before the first bid` : "No retains left"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						disabled: busy || !canRetain || (me?.remaining_points ?? 0) < (state?.retain_price ?? 0),
						onClick: () => void call(() => supabase.rpc("retain_player_v3"), "Player retained to your roster"),
						className: "label-cond border border-gold/50 px-3 py-1.5 text-[12px] text-gold disabled:opacity-40",
						children: ["Retain for ", plainPoints(state?.retain_price ?? 0)]
					})]
				})
			] }),
			bids.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 max-h-40 overflow-y-auto border-t border-line pt-2",
				children: bids.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between py-1 font-mono text-[11px] text-mut",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: b.ambassador_id === me?.id ? "text-gold" : "",
						children: teamName(b.ambassador_id)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: money(b.amount) })]
				}, b.id))
			})
		]
	});
}
function RosterPanel({ roster }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "My Roster"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "font-mono text-[11px] text-mut",
				children: [roster.length, " players"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex flex-col gap-1",
			children: [roster.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-[11px] text-mut",
				children: "No players yet — start bidding!"
			}), roster.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 rounded-lg bg-panel2 px-2.5 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `label-cond px-1.5 py-0.5 text-[10px] ${p.status === "retained" ? "bg-gold/15 text-gold" : "bg-sold/15 text-sold"}`,
						children: p.status === "retained" ? "RET" : `#${p.lot_number ?? ""}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-cond truncate text-[13px]",
						children: p.ingame_name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto font-mono text-[11px] text-mut",
						children: ROLE_LABELS[p.primary_role]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[11px] text-gold",
						children: plainPoints(p.sold_price)
					})
				]
			}, p.id))]
		})]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleGate, {
	role: "ambassador",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AmbassadorConsole, {})
});
//#endregion
export { SplitComponent as component };
