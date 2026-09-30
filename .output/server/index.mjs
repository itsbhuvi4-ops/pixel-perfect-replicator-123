globalThis.__nitro_main__ = import.meta.url;
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { r as FastResponse } from "./_libs/h3-v2+rou3+srvx.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-09-30T18:56:36.795Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"ae-hLVBrSrDdpIw3Xl0dJPRkupPepQ\"",
		"mtime": "2026-09-30T18:56:36.795Z",
		"size": 174,
		"path": "../public/robots.txt"
	},
	"/assets/accounts.functions-2X-p_OED.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a22-zl7BZOp/jVJhlCFgQePCyaLVOMg\"",
		"mtime": "2026-09-30T19:49:19.285Z",
		"size": 6690,
		"path": "../public/assets/accounts.functions-2X-p_OED.js"
	},
	"/assets/admin-cUAVOvIr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53f8-jRCpPMUj5I6dgtMD1GJY88zwYiM\"",
		"mtime": "2026-09-30T19:49:19.290Z",
		"size": 21496,
		"path": "../public/assets/admin-cUAVOvIr.js"
	},
	"/assets/ambassador-Cf24SY7N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d1a-cAkEIHViq706gCX01bqRqG91i94\"",
		"mtime": "2026-09-30T19:49:19.346Z",
		"size": 7450,
		"path": "../public/assets/ambassador-Cf24SY7N.js"
	},
	"/assets/auction-DeZQNZJR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"94-H3BYcev6aH6nB4az46j+4/xaUwM\"",
		"mtime": "2026-09-30T19:49:19.370Z",
		"size": 148,
		"path": "../public/assets/auction-DeZQNZJR.js"
	},
	"/assets/broadcast-B9F971lt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ccd-TLEQlS+Q3ShLCkt+LYuTGH6MXII\"",
		"mtime": "2026-09-30T19:49:19.379Z",
		"size": 3277,
		"path": "../public/assets/broadcast-B9F971lt.js"
	},
	"/assets/caster-B9Deu8tL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"236c-5DTpjXgjx2WTzZWACGC0eNzyKx8\"",
		"mtime": "2026-09-30T19:49:19.396Z",
		"size": 9068,
		"path": "../public/assets/caster-B9Deu8tL.js"
	},
	"/assets/change-password-CKy4bsNw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"65e-OxY7v8WH7pqVtusqclcqZmABJWs\"",
		"mtime": "2026-09-30T19:49:19.421Z",
		"size": 1630,
		"path": "../public/assets/change-password-CKy4bsNw.js"
	},
	"/assets/format-C8QJFllZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"335-mvTy2l/SZsxhm0BLLZ90xsYvBT8\"",
		"mtime": "2026-09-30T19:49:19.540Z",
		"size": 821,
		"path": "../public/assets/format-C8QJFllZ.js"
	},
	"/assets/Guard-CJAzsrQd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"366-GU1wvs3ajs7Xb8sijOD8KVl+EIM\"",
		"mtime": "2026-09-30T19:49:19.253Z",
		"size": 870,
		"path": "../public/assets/Guard-CJAzsrQd.js"
	},
	"/assets/client-D8ej3mKm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"37692-tOyCHLYAOUfKiOMTuEAEc3z0C+s\"",
		"mtime": "2026-09-30T19:49:19.427Z",
		"size": 226962,
		"path": "../public/assets/client-D8ej3mKm.js"
	},
	"/assets/LiveAuction-CBzg1cXT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec5-29xvKx5rrEMjksN5WXZpREwqtRo\"",
		"mtime": "2026-09-30T19:49:19.261Z",
		"size": 3781,
		"path": "../public/assets/LiveAuction-CBzg1cXT.js"
	},
	"/assets/LiveTicker-Dl2F4WWX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18eb-4VrmQCsuDaC2dVodlgIaYltdzsw\"",
		"mtime": "2026-09-30T19:49:19.273Z",
		"size": 6379,
		"path": "../public/assets/LiveTicker-Dl2F4WWX.js"
	},
	"/assets/login-DYR-AE4n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7d9-1gWj6tbb3j0M0FdiuS//fz0mfN8\"",
		"mtime": "2026-09-30T19:49:19.544Z",
		"size": 2009,
		"path": "../public/assets/login-DYR-AE4n.js"
	},
	"/assets/index-D6oMws9q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"661ca-z5MtO3nev317CDvTwQW2g1gxjvU\"",
		"mtime": "2026-09-30T19:49:18.494Z",
		"size": 418250,
		"path": "../public/assets/index-D6oMws9q.js"
	},
	"/assets/my-player-D6nQsn85.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"218e-jQUDSJwCFpGjU6iYShb0quSLpkE\"",
		"mtime": "2026-09-30T19:49:19.548Z",
		"size": 8590,
		"path": "../public/assets/my-player-D6nQsn85.js"
	},
	"/assets/register-DSX0oSdr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a88-Ba9H9UVGD6i0t4rorYxHUnokdpc\"",
		"mtime": "2026-09-30T19:49:19.570Z",
		"size": 2696,
		"path": "../public/assets/register-DSX0oSdr.js"
	},
	"/assets/routes-Ysp1vTDQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"89-ukCjCjYw6wYrQVJu6RtHdjUSQlM\"",
		"mtime": "2026-09-30T19:49:19.582Z",
		"size": 137,
		"path": "../public/assets/routes-Ysp1vTDQ.js"
	},
	"/assets/setup-BtOZQbFk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bc6-OSQRh64/dmSzH7TCGppzdK+1WnM\"",
		"mtime": "2026-09-30T19:49:19.588Z",
		"size": 3014,
		"path": "../public/assets/setup-BtOZQbFk.js"
	},
	"/assets/storage-CP5gT0tb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"130-griiRAA24FrmDBHlRFC3WUicOzM\"",
		"mtime": "2026-09-30T19:49:19.603Z",
		"size": 304,
		"path": "../public/assets/storage-CP5gT0tb.js"
	},
	"/assets/styles-C2wqJsiv.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"12ddf-IzTjs/9kr8sZH3MbIQTocY99r94\"",
		"mtime": "2026-09-30T19:49:19.612Z",
		"size": 77279,
		"path": "../public/assets/styles-C2wqJsiv.css"
	},
	"/assets/use-caster-cam-iPXMW40A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127-V70ZKijg81v5d/K0HoIEd2ipvco\"",
		"mtime": "2026-09-30T19:49:19.606Z",
		"size": 295,
		"path": "../public/assets/use-caster-cam-iPXMW40A.js"
	},
	"/assets/useRouter-COvWD1iF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f6f-hawAHClJq8UTcyibZ7aWstAVnrY\"",
		"mtime": "2026-09-30T19:49:19.608Z",
		"size": 3951,
		"path": "../public/assets/useRouter-COvWD1iF.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_8ehPp9 = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_8ehPp9
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
