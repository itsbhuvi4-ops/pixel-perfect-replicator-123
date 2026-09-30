import { n as __toESM } from "../_runtime.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { g as useServerFn, i as bootstrapAdmin, t as adminExists } from "./accounts.functions-zdl0Unbb.mjs";
import { r as errText, t as Center } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/setup-ClB_Q4N1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SetupPage() {
	const exists = useQuery({
		queryKey: ["admin_exists"],
		queryFn: useServerFn(adminExists)
	});
	if (exists.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: "Loading…" });
	if (exists.data?.exists) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlreadySetup, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupForm, {});
}
function AlreadySetup() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Setup complete"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-mut",
			children: "An admin account already exists for this auction."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena",
			children: "Go to login"
		})
	] }) });
}
function SetupForm() {
	const bootstrap = useServerFn(bootstrapAdmin);
	const qc = useQueryClient();
	const [username, setUsername] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [err, setErr] = (0, import_react.useState)(null);
	const [done, setDone] = (0, import_react.useState)(false);
	const submit = async (e) => {
		e.preventDefault();
		if (password !== confirm) {
			setErr("Passwords don't match");
			return;
		}
		setBusy(true);
		setErr(null);
		try {
			await bootstrap({ data: {
				username,
				password
			} });
			await qc.invalidateQueries({ queryKey: ["admin_exists"] });
			setDone(true);
			toast.success("Admin created — sign in to finish the setup");
		} catch (e2) {
			setErr(errText(e2));
		} finally {
			setBusy(false);
		}
	};
	if (done) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Center, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Admin created"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-3 text-mut",
			children: [
				"Sign in as ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-gold",
					children: username
				}),
				" with the Admin role, then open the Admin panel to seed ambassador and caster accounts."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/login",
			className: "label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena",
			children: "Go to login"
		})
	] }) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-md px-4 py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "First Admin Setup"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-mut",
				children: "This screen works only while the auction has no admin. The account you create here owns the whole event: teams, casters, players and auction settings."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "mt-6 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						placeholder: "Admin username",
						value: username,
						onChange: (e) => setUsername(e.target.value),
						required: true,
						minLength: 3
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						placeholder: "Password (8+ characters)",
						value: password,
						onChange: (e) => setPassword(e.target.value),
						required: true,
						minLength: 8
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						type: "password",
						placeholder: "Repeat password",
						value: confirm,
						onChange: (e) => setConfirm(e.target.value),
						required: true,
						minLength: 8
					}),
					err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-alert",
						children: err
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						disabled: busy,
						className: "label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50",
						children: busy ? "Creating…" : "Create admin account"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "label-cond mt-2 text-center text-[12px] text-mut hover:text-gold",
						children: "I already have an account"
					})
				]
			})
		]
	});
}
//#endregion
export { SetupPage as component };
