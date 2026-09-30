import { n as __toESM } from "../_runtime.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as money, s as statusLabel } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { d as setCasterCam, g as useServerFn } from "./accounts.functions-zdl0Unbb.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { i as useAuctionState, l as usePlayers, n as useAmbassadors, r as useAuctionEvents, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as RoleGate, r as errText } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as PlayerStage, r as startCasterBroadcast, t as LiveTicker } from "./LiveTicker-DB9Eh8PD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/caster-CQdVqcBu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function CasterConsole() {
	useRealtimeAuction();
	const { data: state } = useAuctionState();
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: events = [] } = useAuctionEvents();
	const current = players.find((p) => p.id === state?.current_player_id) ?? null;
	const leader = ambassadors.find((a) => a.id === state?.current_bidder_id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-7xl px-4 py-5 sm:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Caster Console"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "label-cond border border-line bg-panel px-3 py-1 text-[12px] text-mut",
					children: statusLabel(state?.status)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/broadcast",
					className: "label-cond border border-gold/50 px-3 py-1 text-[12px] text-gold",
					children: "Open Broadcast View ↗"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid gap-4 lg:grid-cols-[1fr_340px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerStage, {
						player: current,
						state
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuctionControls, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveTicker, { events })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CasterCamCard, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "On The Block"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 font-display text-3xl",
								children: current?.ingame_name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: state?.current_bid ? `${leader?.team_name ?? "?"} · ${money(state.current_bid)}` : current ? `Base ${money(state?.base_price ?? 0)} — no bids yet` : "No player selected"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmbedUrlCard, {})
				]
			})]
		})]
	});
}
function AuctionControls() {
	const qc = useQueryClient();
	const [busy, setBusy] = (0, import_react.useState)(null);
	const state = useAuctionState().data;
	const status = state?.status;
	const hasCurrent = !!state?.current_player_id;
	const refresh = async () => {
		await qc.invalidateQueries({ queryKey: ["auction_state"] });
		await qc.invalidateQueries({ queryKey: ["players"] });
		await qc.invalidateQueries({ queryKey: ["ambassadors"] });
		await qc.invalidateQueries({ queryKey: ["auction_events"] });
		await qc.invalidateQueries({ queryKey: ["bids"] });
	};
	const rpc = async (key, invoke) => {
		setBusy(key);
		try {
			const { error, data } = await invoke();
			if (error) throw error;
			const res = data;
			if (res?.completed) toast.info("Pool is empty — auction completed");
			else if (res?.result === "sold") toast.success("SOLD! Points deducted and roster assigned");
			else if (res?.result === "unsold") toast.info("No bids — marked UNSOLD");
			else toast.success("Done");
			await refresh();
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(null);
		}
	};
	const disabled = (k) => busy !== null && busy !== k;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "Auction Controls"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					status === "not_started" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("start"),
						onClick: () => void rpc("start", () => supabase.rpc("caster_set_status", { p_status: "live" })),
						className: "label-cond bg-sold px-4 py-2 text-[13px] text-arena disabled:opacity-40",
						children: "▶ Start Auction"
					}),
					status === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("pause"),
						onClick: () => void rpc("pause", () => supabase.rpc("caster_set_status", { p_status: "paused" })),
						className: "label-cond border border-line bg-panel2 px-4 py-2 text-[13px] text-mut hover:text-foreground disabled:opacity-40",
						children: "⏸ Pause"
					}),
					status === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("resume"),
						onClick: () => void rpc("resume", () => supabase.rpc("caster_set_status", { p_status: "live" })),
						className: "label-cond bg-sold px-4 py-2 text-[13px] text-arena disabled:opacity-40",
						children: "▶ Resume"
					}),
					(status === "live" || status === "paused") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("stop"),
						onClick: () => {
							if (confirm("Stop the auction? Bidding closes for everyone.")) rpc("stop", () => supabase.rpc("caster_set_status", { p_status: "stopped" }));
						},
						className: "label-cond border border-alert/50 bg-alert/10 px-4 py-2 text-[13px] text-alert disabled:opacity-40",
						children: "⏹ Stop"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mx-1 w-px bg-line" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("next") || status !== "live" || hasCurrent,
						onClick: () => void rpc("next", () => supabase.rpc("caster_next_player")),
						className: "label-cond border border-gold/50 bg-gold/10 px-4 py-2 text-[13px] text-gold disabled:opacity-40",
						title: status !== "live" ? "Start the auction first" : hasCurrent ? "Finalize the current player first" : "Pick the next player from the pool",
						children: "⏭ Next Player"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: disabled("final") || !hasCurrent || status !== "live",
						onClick: () => void rpc("final", () => supabase.rpc("finalize_player_v3")),
						className: "label-cond bg-gold px-5 py-2 text-[14px] text-arena disabled:opacity-40",
						title: "Sell to the highest bidder (or mark UNSOLD if no bids)",
						children: "🔨 SOLD"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-mono text-[11px] text-mut",
				children: "SOLD assigns the player to the highest bidder, deducts their points atomically and locks the result. No bids → the player goes UNSOLD automatically."
			})
		]
	});
}
function CasterCamCard() {
	const qc = useQueryClient();
	const setCaster = useServerFn(setCasterCam);
	const flagLive = useAuctionState().data?.caster_cam_live ?? false;
	const [devices, setDevices] = (0, import_react.useState)([]);
	const [videoId, setVideoId] = (0, import_react.useState)("default");
	const [audioId, setAudioId] = (0, import_react.useState)("default");
	const [preview, setPreview] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [viewers, setViewers] = (0, import_react.useState)(0);
	const [live, setLive] = (0, import_react.useState)(false);
	const stopRef = (0, import_react.useRef)(null);
	const previewRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		navigator.mediaDevices?.enumerateDevices().then((all) => setDevices(all.filter((d) => d.kind === "videoinput" || d.kind === "audioinput"))).catch(() => {});
		return () => {
			stopRef.current?.();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (previewRef.current && preview) {
			previewRef.current.srcObject = preview;
			previewRef.current.play().catch(() => {});
		}
	}, [preview]);
	const goLive = async () => {
		try {
			const constraints = {
				video: videoId === "default" ? true : { deviceId: { exact: videoId } },
				audio: audioId === "default" ? true : { deviceId: { exact: audioId } }
			};
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			setPreview(stream);
			stopRef.current = startCasterBroadcast(stream, (s, n) => {
				setStatus(s);
				if (n !== void 0) setViewers(n);
			});
			await setCaster({ data: { live: true } });
			setLive(true);
			toast.success("Caster cam is live — audience can see and hear you");
			await qc.invalidateQueries({ queryKey: ["auction_state"] });
		} catch (err) {
			toast.error(errText(err));
		}
	};
	const stopLive = async () => {
		stopRef.current?.();
		stopRef.current = null;
		preview?.getTracks().forEach((t) => t.stop());
		setPreview(null);
		setLive(false);
		setViewers(0);
		await setCaster({ data: { live: false } });
		await qc.invalidateQueries({ queryKey: ["auction_state"] });
		toast.info("Caster cam stopped");
	};
	const videoDevices = devices.filter((d) => d.kind === "videoinput");
	const audioDevices = devices.filter((d) => d.kind === "audioinput");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "label-cond text-[12px] text-mut",
					children: "Caster Cam (WebRTC)"
				}), (live || flagLive) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "label-cond flex items-center gap-1.5 bg-alert px-2 py-0.5 text-[10px] text-white",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "live-dot size-1.5 rounded-full bg-white" }),
						" CAM LIVE · ",
						viewers,
						" 👁"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 aspect-video overflow-hidden rounded-lg bg-panel2",
				children: preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
					ref: previewRef,
					muted: true,
					playsInline: true,
					autoPlay: true,
					className: "size-full object-cover"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "label-cond grid size-full place-items-center text-[12px] text-mut",
					children: "Camera preview"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						value: videoId,
						onChange: (e) => setVideoId(e.target.value),
						disabled: live,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "default",
							children: "Default camera"
						}), videoDevices.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: d.deviceId,
							children: d.label || "Camera"
						}, d.deviceId))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						value: audioId,
						onChange: (e) => setAudioId(e.target.value),
						disabled: live,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "default",
							children: "Default microphone"
						}), audioDevices.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: d.deviceId,
							children: d.label || "Microphone"
						}, d.deviceId))]
					}),
					live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: stopLive,
						className: "label-cond border border-alert/50 bg-alert/10 py-2 text-[13px] text-alert",
						children: "⏹ Stop Camera"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: goLive,
						className: "label-cond bg-alert py-2 text-[13px] text-white",
						children: "🔴 Go Live (Camera + Mic)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-[11px] text-mut",
						children: [
							"Status: ",
							status,
							" — streamed peer-to-peer to every audience and broadcast page."
						]
					})
				]
			})
		]
	});
}
function EmbedUrlCard() {
	const qc = useQueryClient();
	const setCaster = useServerFn(setCasterCam);
	const currentUrl = useAuctionState().data?.caster_stream_url ?? "";
	const [url, setUrl] = (0, import_react.useState)(currentUrl);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const save = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await setCaster({ data: { url } });
			toast.success("Embed URL saved");
			await qc.invalidateQueries({ queryKey: ["auction_state"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: save,
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "External embed URL (optional)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-[11px] text-mut",
				children: "Legacy fallback shown in the stage PiP when the WebRTC cam is off (e.g. a YouTube embed)."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field mt-2 w-full",
				placeholder: "https://…",
				value: url,
				onChange: (e) => setUrl(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: busy,
				className: "label-cond mt-2 border border-line bg-panel2 px-3 py-1.5 text-[12px] text-mut hover:text-foreground disabled:opacity-40",
				children: busy ? "Saving…" : "Save URL"
			})
		]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleGate, {
	role: ["caster", "admin"],
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CasterConsole, {})
});
//#endregion
export { SplitComponent as component };
