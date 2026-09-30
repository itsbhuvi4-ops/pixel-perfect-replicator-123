import { n as __toESM } from "../_runtime.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as ROLE_LABELS, o as pts, t as GAME_ROLES } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient } from "../_libs/react+tanstack__react-query.mjs";
import { a as changeUsername, g as useServerFn } from "./accounts.functions-zdl0Unbb.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { r as useAuth } from "./auth-CNQtMrhD.mjs";
import { i as useAuctionState, s as useMyPlayer, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as RoleGate, r as errText, t as Center } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as uploadPlayerFile } from "./storage-Dw4mQlDn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/my-player-j5UkuVgO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function PlayerDashboard() {
	const { user } = useAuth();
	useRealtimeAuction();
	const { data: state } = useAuctionState();
	const { data: player, isLoading } = useMyPlayer(user?.id);
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: "Loading…" });
	if (!player) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "You're not registered yet"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 max-w-sm text-mut",
			children: "Submit your profile once — name, UID and game role — and you'll enter the auction pool."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/player/register",
			className: "label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena",
			children: "Register as player"
		})
	] }) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-4xl px-4 py-8 sm:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "My Player Profile"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { player })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 grid gap-4 md:grid-cols-[240px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl bg-panel p-4 ring-1 ring-line",
				children: [
					player.photo_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: player.photo_url,
						alt: player.ingame_name,
						className: "aspect-square w-full rounded-lg object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid aspect-square w-full place-items-center rounded-lg bg-panel2 label-cond text-[12px] text-mut",
						children: "No photo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 font-display text-2xl",
						children: player.ingame_name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "font-mono text-[11px] text-mut",
						children: ["UID ", player.game_id]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "label-cond border border-gold/50 px-2 py-0.5 text-[11px] text-gold",
							children: ROLE_LABELS[player.primary_role]
						}), player.secondary_role && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "label-cond border border-line px-2 py-0.5 text-[11px] text-mut",
							children: ROLE_LABELS[player.secondary_role]
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4",
				children: [
					player.status === "in_auction" && state?.current_player_id === player.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "result-stamp rounded-xl bg-alert/15 p-4 ring-1 ring-alert/40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[13px] text-alert",
								children: "You're on the block right now"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-mut",
								children: "Watch live — your lot is being auctioned."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								className: "label-cond mt-2 inline-block bg-alert px-3 py-1.5 text-[12px] text-white",
								children: "Watch live"
							})
						]
					}),
					player.status === "sold" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "result-stamp rounded-xl bg-sold/10 p-4 ring-1 ring-sold/40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond text-[13px] text-sold",
							children: "SOLD"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-mut",
							children: [
								"Congratulations! You were sold for ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-gold",
									children: pts(player.sold_price)
								}),
								". Check your team's console for roster details."
							]
						})]
					}),
					player.status === "retained" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-gold/10 p-4 ring-1 ring-gold/40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond text-[13px] text-gold",
							children: "RETAINED"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-mut",
							children: [
								"A team retained you directly for ",
								pts(player.sold_price),
								"."
							]
						})]
					}),
					player.status === "unsold" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel2 p-4 ring-1 ring-line",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond text-[13px] text-mut",
							children: "UNSOLD"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-mut",
							children: "You went unsold this round. The admin may requeue you for a later round — keep an eye on this page."
						})]
					}),
					player.status === "pool" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "label-cond text-[13px] text-gold",
							children: "Waiting for the auction"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-mut",
							children: "Your profile is locked in the pool. You can still fine-tune it below until the auction starts."
						})]
					}),
					player.status === "pool" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditProfile, { player }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Info"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm",
								children: player.info || "—"
							}),
							player.video_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
								src: player.video_url,
								controls: true,
								className: "mt-3 w-full rounded-lg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 font-mono text-[11px] text-mut",
								children: "Profile is locked once auctioned — results are immutable."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountCard, {})
				]
			})]
		})]
	});
}
function StatusBadge({ player }) {
	const s = {
		pool: {
			label: "In Pool",
			cls: "border-line text-mut"
		},
		in_auction: {
			label: "On The Block",
			cls: "border-alert/50 text-alert"
		},
		sold: {
			label: "SOLD",
			cls: "border-sold/50 text-sold"
		},
		retained: {
			label: "RETAINED",
			cls: "border-gold/50 text-gold"
		},
		unsold: {
			label: "UNSOLD",
			cls: "border-line text-mut"
		}
	}[player.status] ?? {
		label: player.status,
		cls: "border-line text-mut"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: `label-cond border px-3 py-1 text-[12px] ${s.cls}`,
		children: s.label
	});
}
function EditProfile({ player }) {
	const qc = useQueryClient();
	const { user } = useAuth();
	const [f, setF] = (0, import_react.useState)({
		player_name: player.player_name,
		ingame_name: player.ingame_name,
		secondary_role: player.secondary_role ?? "",
		info: player.info ?? ""
	});
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [video, setVideo] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const set = (k) => (e) => setF({
		...f,
		[k]: e.target.value
	});
	const submit = async (e) => {
		e.preventDefault();
		if (!user) return;
		setBusy(true);
		try {
			const patch = {
				player_name: f.player_name.trim(),
				ingame_name: f.ingame_name.trim(),
				secondary_role: f.secondary_role || null,
				info: f.info.trim() || null
			};
			if (photo) patch.photo_url = await uploadPlayerFile("player-photos", user.id, photo);
			if (video && !player.video_url) patch.video_url = await uploadPlayerFile("player-videos", user.id, video);
			const { error } = await supabase.from("players").update(patch).eq("id", player.id);
			if (error) throw error;
			toast.success("Profile updated");
			setPhoto(null);
			setVideo(null);
			await qc.invalidateQueries({ queryKey: ["my_player"] });
			await qc.invalidateQueries({ queryKey: ["players"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "Edit profile"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: "Player name",
						value: f.player_name,
						onChange: set("player_name"),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: "In-game name",
						value: f.ingame_name,
						onChange: set("ingame_name"),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						value: f.secondary_role,
						onChange: set("secondary_role"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "No secondary role"
						}), GAME_ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: r,
							children: ROLE_LABELS[r]
						}, r))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field sm:col-span-2",
						placeholder: "Short info / achievements (optional)",
						value: f.info,
						onChange: set("info")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-xs text-mut",
						children: ["Replace photo", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/*",
							className: "mt-1 block w-full",
							onChange: (e) => setPhoto(e.target.files?.[0] ?? null)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-xs text-mut",
						children: [player.video_url ? "Video uploaded (locked)" : "Upload intro video (locked after upload)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "video/*",
							disabled: !!player.video_url,
							className: "mt-1 block w-full disabled:opacity-50",
							onChange: (e) => setVideo(e.target.files?.[0] ?? null)
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: busy,
				className: "label-cond mt-4 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50",
				children: busy ? "Saving…" : "Save profile"
			})
		]
	});
}
function AccountCard() {
	const { user, username } = useAuth();
	const change = useServerFn(changeUsername);
	const [name, setName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setName(username ?? ""), [username]);
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await change({ data: { username: name } });
			toast.success("Username updated");
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "Account"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-col gap-2 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field flex-1",
					placeholder: "Change username",
					value: name,
					onChange: (e) => setName(e.target.value),
					required: true,
					minLength: 3
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					disabled: busy || name === username,
					className: "label-cond border border-line bg-panel2 px-4 py-2 text-[12px] text-mut hover:text-foreground disabled:opacity-50",
					children: busy ? "Saving…" : "Update"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-mono text-[11px] text-mut",
				children: ["Signed in as ", user ? username : "—"]
			})
		]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleGate, {
	role: "player",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerDashboard, {})
});
//#endregion
export { SplitComponent as component };
