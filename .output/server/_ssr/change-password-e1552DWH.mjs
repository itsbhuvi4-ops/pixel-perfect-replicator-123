import { n as __toESM } from "../_runtime.mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_react, i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { r as useAuth } from "./auth-CNQtMrhD.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/change-password-e1552DWH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ChangePasswordPage() {
	const { session, loading } = useAuth();
	const navigate = useNavigate();
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!loading && !session) navigate({ to: "/login" });
	}, [
		loading,
		session,
		navigate
	]);
	const submit = async (e) => {
		e.preventDefault();
		if (password.length < 8 || password !== confirm) {
			toast.error(password.length < 8 ? "Password must be at least 8 characters" : "Passwords do not match");
			return;
		}
		setBusy(true);
		const { error } = await supabase.auth.updateUser({ password });
		if (!error && session?.user.id) await supabase.from("profiles").update({
			must_change_password: false,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", session.user.id);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Password changed");
		navigate({ to: "/" });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-md px-4 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "label-cond text-[11px] text-gold",
				children: "SECURITY"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-5xl",
				children: "Change Password"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-mut",
				children: "Your first-login password must be changed before you can enter the dashboard."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "mt-6 grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						minLength: 8,
						placeholder: "New password",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						minLength: 8,
						placeholder: "Confirm new password",
						value: confirm,
						onChange: (e) => setConfirm(e.target.value),
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy,
						className: "label-cond bg-gold py-3 text-sm text-arena",
						children: busy ? "Saving…" : "Set new password"
					})
				]
			})
		]
	});
}
//#endregion
export { ChangePasswordPage as component };
