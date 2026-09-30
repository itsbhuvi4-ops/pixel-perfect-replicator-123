import { n as __toESM } from "../_runtime.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as plainPoints, i as money, n as ROLE_LABELS, s as statusLabel } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { f as setUserActive, g as useServerFn, h as updateSettings, l as resetUserPassword, m as updateAmbassador, n as adminRemovePlayer, o as createStaff, p as systemStatus, r as adminRequeuePlayer, s as listUsers, u as seedDefaultAccounts } from "./accounts.functions-zdl0Unbb.mjs";
import { r as useAuth } from "./auth-CNQtMrhD.mjs";
import { i as useAuctionState, l as usePlayers, n as useAmbassadors, u as useRealtimeAuction } from "./auction-B33Zm54r.mjs";
import { n as RoleGate, r as errText } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-cU_L2EP5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TABS = [
	"overview",
	"accounts",
	"teams",
	"players",
	"settings"
];
var TAB_LABELS = {
	overview: "Overview",
	accounts: "Accounts",
	teams: "Teams",
	players: "Players",
	settings: "Auction Settings"
};
function AdminDashboard() {
	useRealtimeAuction();
	const [tab, setTab] = (0, import_react.useState)("overview");
	const { username } = useAuth();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-6xl px-4 py-6 sm:px-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl",
					children: "Admin"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[11px] text-mut",
						children: username
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/broadcast",
						className: "label-cond border border-gold/50 px-3 py-1 text-[12px] text-gold",
						children: "Broadcast View ↗"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "label-cond mt-5 flex flex-wrap gap-1 border-b border-line pb-px text-[13px]",
				children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setTab(t),
					className: tab === t ? "-mb-px border border-line border-b-panel bg-panel px-3.5 py-2 text-foreground" : "px-3.5 py-2 text-mut transition-colors hover:text-foreground",
					children: TAB_LABELS[t]
				}, t))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5",
				children: [
					tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewTab, {}),
					tab === "accounts" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountsTab, {}),
					tab === "teams" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamsTab, {}),
					tab === "players" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayersTab, {}),
					tab === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsTab, {})
				]
			})
		]
	});
}
function OverviewTab() {
	const status = useQuery({
		queryKey: ["system_status"],
		queryFn: useServerFn(systemStatus),
		refetchInterval: 3e4
	});
	const { data: state } = useAuctionState();
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const counts = {
		pool: players.filter((p) => p.status === "pool").length,
		in_auction: players.filter((p) => p.status === "in_auction").length,
		sold: players.filter((p) => p.status === "sold").length,
		retained: players.filter((p) => p.status === "retained").length,
		unsold: players.filter((p) => p.status === "unsold").length
	};
	const pot = players.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Auction"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-3xl",
								children: statusLabel(state?.status)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: ["Lot ", state?.lot_counter ?? 0]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Players"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-3xl",
								children: players.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: [
									counts.pool,
									" pool · ",
									counts.sold,
									" sold · ",
									counts.unsold,
									" unsold"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Teams"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-3xl",
								children: ambassadors.length
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: [money(ambassadors.reduce((s, a) => s + a.remaining_points, 0)), " unspent"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-panel p-4 ring-1 ring-gold/40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "label-cond text-[12px] text-mut",
								children: "Points Spent"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-3xl text-gold",
								children: plainPoints(pot)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11px] text-mut",
								children: [counts.retained, " retained"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl bg-panel p-4 ring-1 ring-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "label-cond text-[12px] text-mut",
						children: "System Health"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void status.refetch(),
						className: "label-cond border border-line bg-panel2 px-3 py-1 text-[11px] text-mut hover:text-foreground",
						children: "Re-check"
					})]
				}), status.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-[12px] text-mut",
					children: "Checking…"
				}) : status.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-mono text-[12px] text-alert",
					children: ["Health check failed — ", errText(status.error)]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-3 font-mono text-[12px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: status.data?.database === "connected" ? "text-sold" : "text-alert",
						children: [
							"● DB ",
							status.data?.database,
							" (",
							status.data?.latencyMs ?? "?",
							" ms)"
						]
					}), (status.data?.buckets ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-mut",
						children: [
							"● bucket ",
							b.name,
							" (",
							b.public ? "public" : "private",
							")"
						]
					}, b.name))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl bg-panel p-4 ring-1 ring-line",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "label-cond text-[12px] text-mut",
					children: "Quick Links"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-2 text-[13px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/caster",
							className: "label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold",
							children: "Caster console"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/broadcast",
							className: "label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold",
							children: "Broadcast output"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auction",
							className: "label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold",
							children: "Audience view"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/player/register",
							className: "label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold",
							children: "Player registration"
						})
					]
				})]
			})
		]
	});
}
function useUsersQuery() {
	return useQuery({
		queryKey: ["admin_users"],
		queryFn: useServerFn(listUsers)
	});
}
function AccountsTab() {
	const users = useUsersQuery();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateStaffCard, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeedCard, {})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl bg-panel p-4 ring-1 ring-line",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "label-cond text-[12px] text-mut",
						children: "All Accounts"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void users.refetch(),
						className: "label-cond border border-line bg-panel2 px-3 py-1 text-[11px] text-mut hover:text-foreground",
						children: "Refresh"
					})]
				}),
				users.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-[12px] text-mut",
					children: "Loading…"
				}),
				users.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[13px] text-alert",
					children: errText(users.error)
				}),
				users.data && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-[13px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "label-cond border-b border-line text-[11px] text-mut",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Username"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Roles"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Joined"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2 pr-3",
									children: "Status"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2",
									children: "Actions"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: users.data.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserRow, { user: u }, u.id)) })]
					})
				})
			]
		})]
	});
}
function UserRow({ user }) {
	const qc = useQueryClient();
	const setActive = useServerFn(setUserActive);
	const resetPw = useServerFn(resetUserPassword);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const active = user.is_active;
	const toggle = async () => {
		setBusy(true);
		try {
			await setActive({ data: {
				userId: user.id,
				active: !active
			} });
			toast.success(active ? "Account deactivated" : "Account activated");
			await qc.invalidateQueries({ queryKey: ["admin_users"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	const reset = async () => {
		if (!confirm(`Reset the password for ${user.username}?`)) return;
		setBusy(true);
		try {
			const res = await resetPw({ data: { userId: user.id } });
			toast.success(`New password: ${res.password} — share it privately`, { duration: 15e3 });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: "border-b border-line/50 font-mono text-[12px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2 pr-3",
				children: user.username
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2 pr-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex flex-wrap gap-1",
					children: user.roles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-cond border border-line px-1.5 py-0.5 text-[10px] text-gold",
						children: r
					}, r))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2 pr-3 text-mut",
				children: new Date(user.created_at).toLocaleDateString()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2 pr-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: active ? "text-sold" : "text-alert",
					children: active ? "active" : "banned"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy,
						onClick: () => void toggle(),
						className: "label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground",
						children: active ? "Deactivate" : "Activate"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy,
						onClick: () => void reset(),
						className: "label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground",
						children: "Reset pw"
					})]
				})
			})
		]
	});
}
function CreateStaffCard() {
	const qc = useQueryClient();
	const create = useServerFn(createStaff);
	const [f, setF] = (0, import_react.useState)({
		username: "",
		password: "",
		role: "ambassador",
		name: "",
		team_name: ""
	});
	const [busy, setBusy] = (0, import_react.useState)(false);
	const set = (k) => (e) => setF({
		...f,
		[k]: e.target.value
	});
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await create({ data: {
				username: f.username,
				password: f.password,
				role: f.role,
				name: f.name,
				team_name: f.role === "ambassador" ? f.team_name : void 0
			} });
			toast.success(`${f.role === "ambassador" ? "Ambassador" : "Caster"} created`);
			setF({
				username: "",
				password: "",
				role: f.role,
				name: "",
				team_name: ""
			});
			await qc.invalidateQueries({ queryKey: ["admin_users"] });
			await qc.invalidateQueries({ queryKey: ["ambassadors"] });
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
				children: "Create ambassador / caster"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-2 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						value: f.role,
						onChange: set("role"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "ambassador",
							children: "Ambassador"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "caster",
							children: "Caster"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: f.role === "ambassador" ? "Ambassador name" : "Caster name",
						value: f.name,
						onChange: set("name"),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: "Username",
						value: f.username,
						onChange: set("username"),
						required: true,
						minLength: 3
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						placeholder: "Password (8+)",
						value: f.password,
						onChange: set("password"),
						required: true,
						minLength: 8
					}),
					f.role === "ambassador" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field sm:col-span-2",
						placeholder: "Team name (unique)",
						value: f.team_name,
						onChange: set("team_name"),
						required: true
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: busy,
				className: "label-cond mt-3 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50",
				children: busy ? "Creating…" : "Create account"
			})
		]
	});
}
function SeedCard() {
	const seed = useServerFn(seedDefaultAccounts);
	const qc = useQueryClient();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [creds, setCreds] = (0, import_react.useState)([]);
	const run = async () => {
		if (!confirm("Create 24 ambassadors (Team 001–024) and 2 casters with random passwords?")) return;
		setBusy(true);
		try {
			const res = await seed();
			setCreds(res?.created ?? []);
			if (!res?.created?.length) toast.info("Nothing to create — all default accounts already exist");
			else toast.success(`${res.created.length} accounts created`);
			await qc.invalidateQueries({ queryKey: ["admin_users"] });
			await qc.invalidateQueries({ queryKey: ["ambassadors"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "Seed default accounts"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-[13px] text-mut",
				children: [
					"Creates ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold",
						children: "Ambassador#001…024"
					}),
					" (Team 001…024) and",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold",
						children: "Caster#001/002"
					}),
					" with random passwords. Existing usernames are skipped."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => void run(),
				disabled: busy,
				className: "label-cond mt-3 border border-gold/50 bg-gold/10 px-4 py-2 text-[13px] text-gold disabled:opacity-50",
				children: busy ? "Seeding…" : "Seed 24 ambassadors + 2 casters"
			}),
			creds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[12px] text-mut",
						children: [creds.length, " accounts created — save these passwords now:"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						readOnly: true,
						value: creds.map((c) => `${c.username} — ${c.password}`).join("\n"),
						className: "field mt-1 h-32 w-full font-mono text-[11px]"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							navigator.clipboard.writeText(creds.map((c) => `${c.username} — ${c.password}`).join("\n"));
							toast.success("Copied");
						},
						className: "label-cond mt-1 border border-line px-3 py-1.5 text-[12px] text-mut hover:text-foreground",
						children: "Copy all"
					})
				]
			})
		]
	});
}
function TeamsTab() {
	const { data: ambassadors = [] } = useAmbassadors();
	const { data: state } = useAuctionState();
	const editable = state?.status === "not_started";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[12px] text-mut",
				children: "Ambassador Teams"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[11px] text-mut",
				children: editable ? "Points editable before start" : "Points locked once the auction starts"
			})]
		}), ambassadors.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 font-mono text-[12px] text-mut",
			children: "No teams yet — create or seed them in Accounts."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 grid gap-2 md:grid-cols-2",
			children: ambassadors.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamRow, {
				id: a.id,
				team: a.team_name,
				name: a.ambassador_name,
				points: a.starting_points,
				editable
			}, a.id))
		})]
	});
}
function TeamRow({ id, team, name, points, editable }) {
	const qc = useQueryClient();
	const update = useServerFn(updateAmbassador);
	const [f, setF] = (0, import_react.useState)({
		team_name: team,
		starting_points: String(points)
	});
	const [busy, setBusy] = (0, import_react.useState)(false);
	const dirty = f.team_name !== team || Number(f.starting_points) !== points;
	const save = async () => {
		setBusy(true);
		try {
			const res = await update({ data: {
				id,
				team_name: f.team_name,
				starting_points: Number(f.starting_points) || 0
			} });
			toast.success(res.pointsChanged ? "Team updated (points reset)" : "Team name updated");
			await qc.invalidateQueries({ queryKey: ["ambassadors"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-panel2 p-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "label-cond flex-1 truncate text-[12px] text-mut",
				children: name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: busy || !dirty,
				onClick: () => void save(),
				className: "label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground disabled:opacity-30",
				children: "Save"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1.5 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field flex-1 !py-1.5 text-[12px]",
				value: f.team_name,
				onChange: (e) => setF({
					...f,
					team_name: e.target.value
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field w-28 !py-1.5 text-right font-mono text-[12px]",
				value: f.starting_points,
				onChange: (e) => setF({
					...f,
					starting_points: e.target.value
				}),
				disabled: !editable,
				inputMode: "numeric"
			})]
		})]
	});
}
function PlayersTab() {
	const { data: players = [] } = usePlayers();
	const { data: ambassadors = [] } = useAmbassadors();
	const [filter, setFilter] = (0, import_react.useState)("all");
	const teamName = (id) => ambassadors.find((a) => a.id === id)?.team_name ?? "—";
	const filtered = players.filter((p) => filter === "all" || p.status === filter);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-panel p-4 ring-1 ring-line",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "label-cond text-[12px] text-mut",
				children: [
					"Players (",
					players.length,
					")"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				className: "field !w-auto !py-1 text-[12px]",
				value: filter,
				onChange: (e) => setFilter(e.target.value),
				children: [
					"all",
					"pool",
					"in_auction",
					"sold",
					"retained",
					"unsold"
				].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: s,
					children: s
				}, s))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-[13px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "label-cond border-b border-line text-[11px] text-mut",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Player"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "UID"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Role"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Status"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Team"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3",
							children: "Price"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2",
							children: "Actions"
						})
					]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [filtered.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-line/50 font-mono text-[12px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "py-2 pr-3",
							children: [
								p.ingame_name,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-mut",
									children: [
										"(",
										p.player_name,
										")"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 text-mut",
							children: p.game_id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 text-mut",
							children: ROLE_LABELS[p.primary_role]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: p.status === "sold" ? "text-sold" : p.status === "in_auction" ? "text-alert" : p.status === "retained" ? "text-gold" : "text-mut",
								children: p.status
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3",
							children: teamName(p.ambassador_id)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3",
							children: p.sold_price ? plainPoints(p.sold_price) : "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerActions, {
								id: p.id,
								status: p.status
							})
						})
					]
				}, p.id)), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					colSpan: 7,
					className: "py-3 text-center font-mono text-[12px] text-mut",
					children: "No players"
				}) })] })]
			})
		})]
	});
}
function PlayerActions({ id, status }) {
	const qc = useQueryClient();
	const remove = useServerFn(adminRemovePlayer);
	const requeue = useServerFn(adminRequeuePlayer);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const run = async (fn, msg) => {
		setBusy(true);
		try {
			await fn();
			toast.success(msg);
			await qc.invalidateQueries({ queryKey: ["players"] });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	if (status === "pool") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		disabled: busy,
		onClick: () => {
			if (confirm("Remove this player from the pool permanently?")) run(() => remove({ data: { playerId: id } }), "Player removed");
		},
		className: "label-cond border border-alert/40 px-2 py-0.5 text-[11px] text-alert disabled:opacity-30",
		children: "Remove"
	});
	if (status === "unsold") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		disabled: busy,
		onClick: () => void run(() => requeue({ data: { playerId: id } }), "Requeued to pool"),
		className: "label-cond border border-gold/50 px-2 py-0.5 text-[11px] text-gold disabled:opacity-30",
		children: "Requeue"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-[11px] text-mut",
		children: "locked"
	});
}
var DEFAULT_SETTINGS = {
	tournament_name: "PRO LEAGUE",
	base_price: "1000",
	min_increment: "500",
	default_starting_points: "50000",
	retain_price: "5000",
	max_retains: "1",
	max_players: "50",
	max_ambassadors: "24",
	max_casters: "2",
	apply_points_to_all: true
};
function SettingsTab() {
	const qc = useQueryClient();
	const { data: state } = useAuctionState();
	const save = useServerFn(updateSettings);
	const [f, setF] = (0, import_react.useState)(DEFAULT_SETTINGS);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	if (state && !loaded) {
		setLoaded(true);
		setF({
			tournament_name: state.tournament_name,
			base_price: String(state.base_price),
			min_increment: String(state.min_increment),
			default_starting_points: String(state.default_starting_points),
			retain_price: String(state.retain_price),
			max_retains: String(state.max_retains),
			max_players: String(state.max_players),
			max_ambassadors: String(state.max_ambassadors),
			max_casters: String(state.max_casters),
			apply_points_to_all: true
		});
	}
	const num = (v) => Number(v.replace(/[^0-9]/g, "")) || 0;
	const set = (k) => (e) => setF({
		...f,
		[k]: e.target.type === "checkbox" ? e.target.checked : e.target.value
	});
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await save({ data: {
				tournament_name: f.tournament_name,
				base_price: num(f.base_price),
				min_increment: num(f.min_increment),
				default_starting_points: num(f.default_starting_points),
				retain_price: num(f.retain_price),
				max_retains: num(f.max_retains),
				max_players: num(f.max_players),
				max_ambassadors: num(f.max_ambassadors),
				max_casters: num(f.max_casters),
				apply_points_to_all: f.apply_points_to_all
			} });
			toast.success("Settings saved");
			await qc.invalidateQueries({ queryKey: ["auction_state"] });
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
				children: "Auction Settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Tournament name",
						className: "sm:col-span-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							value: f.tournament_name,
							onChange: set("tournament_name"),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Base price",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.base_price,
							onChange: set("base_price")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Min increment",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.min_increment,
							onChange: set("min_increment")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Starting points",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.default_starting_points,
							onChange: set("default_starting_points")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Retain price",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.retain_price,
							onChange: set("retain_price")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Max retains per team",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.max_retains,
							onChange: set("max_retains")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Max players",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.max_players,
							onChange: set("max_players")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Max ambassadors",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.max_ambassadors,
							onChange: set("max_ambassadors")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Max casters",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "field w-full",
							inputMode: "numeric",
							value: f.max_casters,
							onChange: set("max_casters")
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-3 flex items-center gap-2 text-[13px] text-mut",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: f.apply_points_to_all,
					onChange: set("apply_points_to_all")
				}), "Also reset every team's points to the new starting value (only works before the auction starts)"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				disabled: busy,
				className: "label-cond mt-4 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50",
				children: busy ? "Saving…" : "Save settings"
			})
		]
	});
}
function Field({ label, className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: `block ${className ?? ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "label-cond text-[11px] text-mut",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-1 block",
			children
		})]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleGate, {
	role: "admin",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDashboard, {})
});
//#endregion
export { SplitComponent as component };
