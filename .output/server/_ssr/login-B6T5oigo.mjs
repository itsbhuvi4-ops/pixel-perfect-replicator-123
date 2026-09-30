import { n as __toESM } from "../_runtime.mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as usernameToEmail } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { _ as verifyLogin, g as useServerFn, t as adminExists } from "./accounts.functions-zdl0Unbb.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { n as homeForRoles } from "./auth-CNQtMrhD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-B6T5oigo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const verify = useServerFn(verifyLogin);
	const navigate = useNavigate();
	const { data: adminState } = useQuery({
		queryKey: ["admin_exists"],
		queryFn: useServerFn(adminExists)
	});
	const [username, setUsername] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [role, setRole] = (0, import_react.useState)("player");
	const [err, setErr] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setErr(null);
		const { error } = await supabase.auth.signInWithPassword({
			email: usernameToEmail(username),
			password
		});
		if (error) {
			setBusy(false);
			setErr("Wrong username or password");
			return;
		}
		const res = await verify({ data: { role } });
		setBusy(false);
		if (!res.ok) {
			await supabase.auth.signOut();
			setErr(res.error);
			return;
		}
		navigate({ to: homeForRoles([role]) });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-sm px-4 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Login"
			}),
			adminState && !adminState.exists && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-gold",
				children: [
					"No admin exists yet.",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/setup",
						className: "underline",
						children: "Run the first-time setup"
					}),
					" ",
					"to create one."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "mt-6 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: "Username",
						value: username,
						onChange: (e) => setUsername(e.target.value),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						placeholder: "Password",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						value: role,
						onChange: (e) => setRole(e.target.value),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "admin",
								children: "Admin"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "ambassador",
								children: "Ambassador"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "caster",
								children: "Caster"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "player",
								children: "Player"
							})
						]
					}),
					err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-alert",
						children: err
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy,
						className: "label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50",
						children: busy ? "Signing in…" : "Sign in"
					})
				]
			})
		]
	});
}
//#endregion
export { LoginPage as component };
