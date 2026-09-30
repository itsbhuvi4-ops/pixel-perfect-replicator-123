import { n as __toESM } from "../_runtime.mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as usernameToEmail, n as ROLE_LABELS, t as GAME_ROLES } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as registerPlayer, g as useServerFn } from "./accounts.functions-zdl0Unbb.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
import { r as errText } from "./Guard-CQQKIH1i.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as uploadPlayerFile } from "./storage-Dw4mQlDn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/register-BAfGN279.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function RegisterPage() {
	const register = useServerFn(registerPlayer);
	const navigate = useNavigate();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [f, setF] = (0, import_react.useState)({
		username: "",
		password: "",
		player_name: "",
		uid: "",
		game_name: "",
		primary_role: "primary_rusher"
	});
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [video, setVideo] = (0, import_react.useState)(null);
	const set = (k) => (e) => setF({
		...f,
		[k]: e.target.value
	});
	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		try {
			await register({ data: {
				...f,
				primary_role: f.primary_role
			} });
			const { data: auth, error } = await supabase.auth.signInWithPassword({
				email: usernameToEmail(f.username),
				password: f.password
			});
			if (error || !auth.user) throw error;
			const patch = {};
			if (photo) patch.photo_url = await uploadPlayerFile("player-photos", auth.user.id, photo);
			if (video) patch.video_url = await uploadPlayerFile("player-videos", auth.user.id, video);
			if (Object.keys(patch).length) await supabase.from("players").update(patch).eq("user_id", auth.user.id);
			toast.success("Registered — you're in the auction pool");
			navigate({ to: "/my-player" });
		} catch (err) {
			toast.error(errText(err));
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-xl px-4 py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-4xl",
			children: "Player Registration"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submit,
			className: "mt-6 grid gap-3 sm:grid-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					placeholder: "Username",
					value: f.username,
					onChange: set("username"),
					required: true
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					placeholder: "Player name",
					value: f.player_name,
					onChange: set("player_name"),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					placeholder: "UID",
					value: f.uid,
					onChange: set("uid"),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					placeholder: "Game name",
					value: f.game_name,
					onChange: set("game_name"),
					required: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "field",
					value: f.primary_role,
					onChange: set("primary_role"),
					children: GAME_ROLES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: r,
						children: ROLE_LABELS[r]
					}, r))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-xs text-mut",
					children: ["Photo", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "file",
						accept: "image/*",
						className: "mt-1 block w-full",
						onChange: (e) => setPhoto(e.target.files?.[0] ?? null)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-xs text-mut",
					children: ["Video (locked after upload)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "file",
						accept: "video/*",
						className: "mt-1 block w-full",
						onChange: (e) => setVideo(e.target.files?.[0] ?? null)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					disabled: busy,
					className: "label-cond bg-gold py-2.5 text-[13px] text-arena disabled:opacity-50 sm:col-span-2",
					children: busy ? "Registering…" : "Register"
				})
			]
		})]
	});
}
//#endregion
export { RegisterPage as component };
