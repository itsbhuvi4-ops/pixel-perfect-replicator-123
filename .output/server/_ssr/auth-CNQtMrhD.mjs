import { n as __toESM } from "../_runtime.mjs";
import { a as require_react, i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-CNQtMrhD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AuthContext = (0, import_react.createContext)({
	session: null,
	user: null,
	roles: [],
	username: null,
	loading: true,
	signOut: async () => {}
});
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [roles, setRoles] = (0, import_react.useState)([]);
	const [username, setUsername] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
			setSession(next);
			if (!next) {
				setRoles([]);
				setUsername(null);
			}
		});
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			setLoading(false);
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	(0, import_react.useEffect)(() => {
		const uid = session?.user.id;
		if (!uid) return;
		let cancelled = false;
		(async () => {
			const [{ data: roleRows }, { data: profile }] = await Promise.all([supabase.from("user_roles").select("role").eq("user_id", uid), supabase.from("profiles").select("username").eq("id", uid).maybeSingle()]);
			if (cancelled) return;
			setRoles((roleRows ?? []).map((r) => r.role));
			setUsername(profile?.username ?? null);
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [session?.user.id]);
	const value = {
		session,
		user: session?.user ?? null,
		roles,
		username,
		loading,
		signOut: async () => {
			await supabase.auth.signOut();
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, {
		value,
		children
	});
}
function useAuth() {
	return (0, import_react.useContext)(AuthContext);
}
function homeForRoles(roles) {
	if (roles.includes("admin")) return "/admin";
	if (roles.includes("caster")) return "/caster";
	if (roles.includes("ambassador")) return "/ambassador";
	if (roles.includes("player")) return "/my-player";
	return "/auction";
}
//#endregion
export { homeForRoles as n, useAuth as r, AuthProvider as t };
