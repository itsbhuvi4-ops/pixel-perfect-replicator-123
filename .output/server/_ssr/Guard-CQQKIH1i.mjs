import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { r as useAuth } from "./auth-CNQtMrhD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Guard-CQQKIH1i.js
var import_jsx_runtime = require_jsx_runtime();
/** UI gate only — every action is re-checked by the server. */
function RoleGate({ role, children }) {
	const { session, roles, loading } = useAuth();
	const allowed = Array.isArray(role) ? role : [role];
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: "Loading…" });
	if (!session) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Center, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Please log in to continue." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/login",
		className: "label-cond mt-4 inline-block bg-gold px-4 py-2 text-[12px] text-arena",
		children: "Login"
	})] });
	if (!roles.some((r) => allowed.includes(r))) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: "This page isn't available for your account." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function Center({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid min-h-[60vh] place-items-center px-4 text-center text-mut",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children })
	});
}
function errText(e) {
	if (e && typeof e === "object" && "message" in e) return String(e.message);
	return "Something went wrong";
}
//#endregion
export { RoleGate as n, errText as r, Center as t };
