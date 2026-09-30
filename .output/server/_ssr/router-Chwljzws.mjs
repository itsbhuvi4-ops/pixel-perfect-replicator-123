import { n as __toESM } from "../_runtime.mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, l as useLocation, m as createFileRoute, p as lazyRouteComponent, s as Scripts, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_react, i as require_jsx_runtime, n as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { r as useAuth, t as AuthProvider } from "./auth-CNQtMrhD.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { i as useAuctionState } from "./auction-B33Zm54r.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Chwljzws.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-C2wqJsiv.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
var NAV = [{
	to: "/",
	label: "Live"
}, {
	to: "/auction",
	label: "Watch"
}];
function SiteHeader() {
	const { session, roles, username, signOut } = useAuth();
	const { data: state } = useAuctionState();
	if (useLocation().pathname.startsWith("/broadcast")) return null;
	const roleLinks = [];
	if (roles.includes("ambassador")) roleLinks.push({
		to: "/ambassador",
		label: "Team Console"
	});
	if (roles.includes("caster")) roleLinks.push({
		to: "/caster",
		label: "Caster"
	});
	if (roles.includes("admin")) roleLinks.push({
		to: "/admin",
		label: "Admin"
	});
	if (roles.includes("player")) roleLinks.push({
		to: "/my-player",
		label: "My Profile"
	});
	const live = state?.status === "live";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-14 items-center gap-4 border-b border-line px-4 sm:px-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "font-display text-xl tracking-wide",
				children: [
					"BidX",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-gold",
						children: "."
					}),
					"AUCTIONS"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "label-cond hidden gap-5 text-[13px] text-mut md:flex",
				children: [...NAV, ...roleLinks].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: item.to,
					activeProps: { className: "text-foreground" },
					className: "transition-colors hover:text-foreground",
					children: item.label
				}, item.to))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-3",
				children: [
					live && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5 border border-alert/30 bg-alert/10 px-2 py-1 font-mono text-[11px] text-alert",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "live-dot size-1.5 rounded-full bg-alert" }), "ON AIR"]
					}),
					state?.status === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "border border-line bg-panel px-2 py-1 font-mono text-[11px] text-mut",
						children: "PAUSED"
					}),
					session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden font-mono text-[11px] text-mut sm:inline",
							children: username
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => void signOut(),
							className: "label-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] text-mut transition-colors hover:text-foreground",
							children: "Sign out"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "label-cond bg-gold px-3 py-1.5 text-[12px] text-arena transition-opacity hover:opacity-90",
						children: "Login"
					})
				]
			})
		]
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-7xl text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "label-cond bg-gold px-4 py-2 text-sm text-arena",
						children: "Go to live auction"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-xl font-semibold text-foreground",
				children: "This page didn't load"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => {
					router.invalidate();
					reset();
				},
				className: "label-cond mt-6 bg-gold px-4 py-2 text-sm text-arena",
				children: "Try again"
			})]
		})
	});
}
var Route$11 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "RA Auctions — Live Esports Player Auction" },
			{
				name: "description",
				content: "Real-time esports player auction with live bidding."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "dark",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "min-h-screen bg-background text-foreground",
			children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
		})]
	});
}
function RootComponent() {
	const { queryClient } = Route$11.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthProvider, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {})
		] })
	});
}
var $$splitComponentImporter$10 = () => import("./routes-CmBgPodi.mjs");
var Route$10 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Live Auction — BidX" },
		{
			name: "description",
			content: "Watch the esports player auction live: current player, highest bid and teams."
		},
		{
			property: "og:title",
			content: "Live Auction — BidX"
		},
		{
			property: "og:description",
			content: "Watch the esports player auction live with real-time bids."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./admin-cU_L2EP5.mjs");
var Route$9 = createFileRoute("/admin")({
	head: () => ({ meta: [{ title: "Admin — BidX Auction" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./ambassador-D29glmv4.mjs");
var Route$8 = createFileRoute("/ambassador")({
	head: () => ({ meta: [{ title: "Team Console — BidX Auction" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./auction-Bf89XxuJ.mjs");
/** Audience view — watch the live auction without an account. */
var Route$7 = createFileRoute("/auction")({
	head: () => ({ meta: [
		{ title: "Watch Live — BidX Auction" },
		{
			name: "description",
			content: "Watch the BidX player auction live, no account needed. Bids update in real time."
		},
		{
			property: "og:title",
			content: "Watch Live — BidX Auction"
		},
		{
			property: "og:description",
			content: "Live esports player auction with real-time bidding."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./broadcast-DNpA-WpV.mjs");
/**
* Broadcast View — clean fullscreen output for OBS / YouTube capture.
* No header, no navigation; everything on one screen, sized for 16:9.
*/
var Route$6 = createFileRoute("/broadcast")({
	head: () => ({ meta: [{ title: "Broadcast — BidX Auction" }, {
		name: "description",
		content: "Fullscreen broadcast output for OBS and YouTube."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./caster-CQdVqcBu.mjs");
var Route$5 = createFileRoute("/caster")({
	head: () => ({ meta: [{ title: "Caster Console — BidX Auction" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./change-password-e1552DWH.mjs");
var Route$4 = createFileRoute("/change-password")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./login-B6T5oigo.mjs");
var Route$3 = createFileRoute("/login")({
	head: () => ({ meta: [
		{ title: "Login — BidX Auction" },
		{
			name: "description",
			content: "Sign in as admin, caster, ambassador or player."
		},
		{
			property: "og:title",
			content: "Login — BidX Auction"
		},
		{
			property: "og:description",
			content: "One login for every auction role."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./my-player-j5UkuVgO.mjs");
var Route$2 = createFileRoute("/my-player")({
	head: () => ({ meta: [{ title: "My Player Profile — BidX Auction" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./setup-ClB_Q4N1.mjs");
var Route$1 = createFileRoute("/setup")({
	head: () => ({ meta: [{ title: "First Admin Setup — BidX Auction" }, {
		name: "robots",
		content: "noindex"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./register-BAfGN279.mjs");
var Route = createFileRoute("/player/register")({
	head: () => ({ meta: [
		{ title: "Player Registration — BidX Auction" },
		{
			name: "description",
			content: "Register once to enter the auction player pool."
		},
		{
			property: "og:title",
			content: "Player Registration — BidX Auction"
		},
		{
			property: "og:description",
			content: "Register once to enter the auction pool."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$10.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$11
	}),
	AdminRoute: Route$9.update({
		id: "/admin",
		path: "/admin",
		getParentRoute: () => Route$11
	}),
	AmbassadorRoute: Route$8.update({
		id: "/ambassador",
		path: "/ambassador",
		getParentRoute: () => Route$11
	}),
	AuctionRoute: Route$7.update({
		id: "/auction",
		path: "/auction",
		getParentRoute: () => Route$11
	}),
	BroadcastRoute: Route$6.update({
		id: "/broadcast",
		path: "/broadcast",
		getParentRoute: () => Route$11
	}),
	CasterRoute: Route$5.update({
		id: "/caster",
		path: "/caster",
		getParentRoute: () => Route$11
	}),
	ChangePasswordRoute: Route$4.update({
		id: "/change-password",
		path: "/change-password",
		getParentRoute: () => Route$11
	}),
	LoginRoute: Route$3.update({
		id: "/login",
		path: "/login",
		getParentRoute: () => Route$11
	}),
	MyPlayerRoute: Route$2.update({
		id: "/my-player",
		path: "/my-player",
		getParentRoute: () => Route$11
	}),
	SetupRoute: Route$1.update({
		id: "/setup",
		path: "/setup",
		getParentRoute: () => Route$11
	}),
	PlayerRegisterRoute: Route.update({
		id: "/player/register",
		path: "/player/register",
		getParentRoute: () => Route$11
	})
};
var routeTree = Route$11._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
