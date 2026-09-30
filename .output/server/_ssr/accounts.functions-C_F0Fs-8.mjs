import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-UH_Jp6hR.mjs";
import { c as usernameToEmail } from "./format-Dl7fjJRF.mjs";
import { a as objectType, i as numberType, n as enumType, o as stringType, r as literalType, t as booleanType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/accounts.functions-C_F0Fs-8.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var username = stringType().trim().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_#.-]+$/, "Username can use letters, numbers, _ # . -");
var password = stringType().min(8, "Password must be at least 8 characters").max(72);
var roleEnum = enumType([
	"primary_rusher",
	"secondary_rusher",
	"sniper",
	"nader",
	"supporter"
]);
/** Turn database/raw errors into short, safe messages. */
function friendly(msg) {
	if (!msg) return "Something went wrong";
	if (/duplicate|already|23505/i.test(msg)) return "Already Registered";
	if (msg.length > 120 || /relation|column|syntax|violates/i.test(msg)) {
		console.error("[accounts]", msg);
		return "Something went wrong. Please try again.";
	}
	return msg;
}
async function admin() {
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	return supabaseAdmin;
}
async function createAccount(u, p, role) {
	const sa = await admin();
	const uname = u.trim();
	const { data: taken } = await sa.from("profiles").select("id").ilike("username", uname).maybeSingle();
	if (taken) throw new Error("Already Registered");
	const { data, error } = await sa.auth.admin.createUser({
		email: usernameToEmail(uname),
		password: p,
		email_confirm: true
	});
	if (error || !data.user) throw new Error(friendly(error?.message));
	const id = data.user.id;
	const { error: pe } = await sa.from("profiles").insert({
		id,
		username: uname,
		display_name: uname
	});
	if (pe) {
		await sa.auth.admin.deleteUser(id);
		throw new Error("Already Registered");
	}
	await sa.from("user_roles").insert({
		user_id: id,
		role
	});
	return id;
}
async function rolesOf(ctx) {
	const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
	return (data ?? []).map((r) => r.role);
}
async function requireRole(ctx, allowed) {
	const roles = await rolesOf(ctx);
	const { data: prof } = await ctx.supabase.from("profiles").select("is_active").eq("id", ctx.userId).maybeSingle();
	if (!prof?.is_active) throw new Error("Your account is deactivated");
	if (!roles.some((r) => allowed.includes(r))) throw new Error("Not allowed");
}
var registerPlayer_createServerFn_handler = createServerRpc({
	id: "9df7d613f47b3a4bde07bc5290e9450ee3882f0fb02a6a3099a37b3a4913ef19",
	name: "registerPlayer",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => registerPlayer.__executeServer(opts));
var registerPlayer = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	username,
	password,
	player_name: stringType().trim().min(2).max(60),
	uid: stringType().trim().min(3).max(40),
	game_name: stringType().trim().min(2).max(40),
	primary_role: roleEnum
}).parse(d)).handler(registerPlayer_createServerFn_handler, async ({ data }) => {
	const sa = await admin();
	const { data: dupe } = await sa.from("players").select("id").eq("game_id", data.uid).maybeSingle();
	if (dupe) throw new Error("Already Registered");
	const id = await createAccount(data.username, data.password, "player");
	const { error } = await sa.from("players").insert({
		user_id: id,
		player_name: data.player_name,
		ingame_name: data.game_name,
		game_id: data.uid,
		primary_role: data.primary_role
	});
	if (error) {
		await sa.auth.admin.deleteUser(id);
		throw new Error(friendly(error.message));
	}
	return { ok: true };
});
var adminExists_createServerFn_handler = createServerRpc({
	id: "e5b68d0b51507f55fef9d795077b7b36d3109cdaa2608ddce017d9abd60c79d2",
	name: "adminExists",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => adminExists.__executeServer(opts));
var adminExists = createServerFn({ method: "GET" }).handler(adminExists_createServerFn_handler, async () => {
	const { count } = await (await admin()).from("user_roles").select("id", {
		count: "exact",
		head: true
	}).eq("role", "admin");
	return { exists: (count ?? 0) > 0 };
});
var bootstrapAdmin_createServerFn_handler = createServerRpc({
	id: "cae8c00623ff8792b2fd5737142e3ecc564c65bbc278c6ce17817b41bc7af529",
	name: "bootstrapAdmin",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => bootstrapAdmin.__executeServer(opts));
var bootstrapAdmin = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	username,
	password
}).parse(d)).handler(bootstrapAdmin_createServerFn_handler, async ({ data }) => {
	const { count } = await (await admin()).from("user_roles").select("id", {
		count: "exact",
		head: true
	}).eq("role", "admin");
	if ((count ?? 0) > 0) throw new Error("An admin already exists");
	await createAccount(data.username, data.password, "admin");
	return { ok: true };
});
var verifyLogin_createServerFn_handler = createServerRpc({
	id: "187516672e44f284520ad54d8296517aeccb76c9f5baaaa706b79befa7842fc9",
	name: "verifyLogin",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => verifyLogin.__executeServer(opts));
var verifyLogin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ role: enumType([
	"admin",
	"caster",
	"ambassador",
	"player"
]) }).parse(d)).handler(verifyLogin_createServerFn_handler, async ({ data, context }) => {
	const roles = await rolesOf(context);
	const { data: prof } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
	if (!prof?.is_active) return {
		ok: false,
		error: "This account is deactivated. Contact the admin."
	};
	if (!roles.includes(data.role)) return {
		ok: false,
		error: "This account doesn't have that role."
	};
	return {
		ok: true,
		error: null
	};
});
var changeUsername_createServerFn_handler = createServerRpc({
	id: "a4804d8ce3fb791b76bd5497fbe6d64880483a463be9a81f311f49da914b311e",
	name: "changeUsername",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => changeUsername.__executeServer(opts));
var changeUsername = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ username }).parse(d)).handler(changeUsername_createServerFn_handler, async ({ data, context }) => {
	const sa = await admin();
	const { data: taken } = await sa.from("profiles").select("id").ilike("username", data.username).maybeSingle();
	if (taken && taken.id !== context.userId) throw new Error("That username is taken");
	const { error } = await sa.auth.admin.updateUserById(context.userId, { email: usernameToEmail(data.username) });
	if (error) throw new Error(friendly(error.message));
	await sa.from("profiles").update({
		username: data.username,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", context.userId);
	return { ok: true };
});
var listUsers_createServerFn_handler = createServerRpc({
	id: "d84bb0630a88e021269646cb51e5391a66f221178b45f48a40bfe1285239bc6b",
	name: "listUsers",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => listUsers.__executeServer(opts));
var listUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listUsers_createServerFn_handler, async ({ context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const [{ data: profiles }, { data: roles }] = await Promise.all([sa.from("profiles").select("id, username, display_name, is_active, created_at").order("created_at"), sa.from("user_roles").select("user_id, role")]);
	return (profiles ?? []).map((p) => ({
		...p,
		roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role)
	}));
});
var setUserActive_createServerFn_handler = createServerRpc({
	id: "8c9a05e86585be9d4fcc299b869fc1e68acfae4320291e85282a1ad3da47a5d8",
	name: "setUserActive",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => setUserActive.__executeServer(opts));
var setUserActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	userId: stringType().uuid(),
	active: booleanType()
}).parse(d)).handler(setUserActive_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	if (data.userId === context.userId) throw new Error("You can't deactivate yourself");
	const sa = await admin();
	await sa.from("profiles").update({
		is_active: data.active,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.userId);
	await sa.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
	return { ok: true };
});
var resetUserPassword_createServerFn_handler = createServerRpc({
	id: "681f5a4353603fef0ba78844636c0810dcc433879cea82d80405f063d30dc2d7",
	name: "resetUserPassword",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => resetUserPassword.__executeServer(opts));
var resetUserPassword = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ userId: stringType().uuid() }).parse(d)).handler(resetUserPassword_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const pw = randomPassword();
	const { error } = await sa.auth.admin.updateUserById(data.userId, { password: pw });
	if (error) throw new Error(friendly(error.message));
	return { password: pw };
});
function randomPassword() {
	const bytes = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(9));
	return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 55]).join("") + "!7";
}
var seedDefaultAccounts_createServerFn_handler = createServerRpc({
	id: "91295bbee4fe3cc52c95dc092384decd4deb98543c704888bbeeef4e7c511718",
	name: "seedDefaultAccounts",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => seedDefaultAccounts.__executeServer(opts));
var seedDefaultAccounts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(seedDefaultAccounts_createServerFn_handler, async ({ context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { data: st } = await sa.from("auction_state").select("default_starting_points").eq("id", 1).single();
	const start = st?.default_starting_points ?? 5e4;
	const created = [];
	for (let i = 1; i <= 24; i++) {
		const u = `Ambassador#${String(i).padStart(3, "0")}`;
		const { data: exists } = await sa.from("profiles").select("id").ilike("username", u).maybeSingle();
		if (exists) continue;
		const pw = randomPassword();
		const id = await createAccount(u, pw, "ambassador");
		await sa.from("ambassadors").insert({
			user_id: id,
			ambassador_name: u,
			team_name: `Team ${String(i).padStart(3, "0")}`,
			starting_points: start,
			remaining_points: start
		});
		created.push({
			username: u,
			password: pw
		});
	}
	for (let i = 1; i <= 2; i++) {
		const u = `Caster#${String(i).padStart(3, "0")}`;
		const { data: exists } = await sa.from("profiles").select("id").ilike("username", u).maybeSingle();
		if (exists) continue;
		const pw = randomPassword();
		const id = await createAccount(u, pw, "caster");
		await sa.from("casters").insert({
			user_id: id,
			caster_name: u
		});
		created.push({
			username: u,
			password: pw
		});
	}
	return { created };
});
var createStaff_createServerFn_handler = createServerRpc({
	id: "6687b5862735cdb048f8a10c652352f47ff2a8b866ef1d9240d573cbb7544b17",
	name: "createStaff",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => createStaff.__executeServer(opts));
var createStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	username,
	password,
	role: enumType(["caster", "ambassador"]),
	name: stringType().trim().min(2).max(60),
	team_name: stringType().trim().max(40).optional()
}).parse(d)).handler(createStaff_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { data: st } = await sa.from("auction_state").select("*").eq("id", 1).single();
	if (data.role === "ambassador") {
		if (!data.team_name) throw new Error("Team name is required");
		const { count } = await sa.from("ambassadors").select("id", {
			count: "exact",
			head: true
		});
		if (st && (count ?? 0) >= st.max_ambassadors) throw new Error("Ambassador limit reached");
	} else {
		const { count } = await sa.from("casters").select("id", {
			count: "exact",
			head: true
		});
		if (st && (count ?? 0) >= st.max_casters) throw new Error("Caster limit reached");
	}
	const id = await createAccount(data.username, data.password, data.role);
	const { error } = data.role === "ambassador" ? await sa.from("ambassadors").insert({
		user_id: id,
		ambassador_name: data.name,
		team_name: data.team_name,
		starting_points: st?.default_starting_points ?? 5e4,
		remaining_points: st?.default_starting_points ?? 5e4
	}) : await sa.from("casters").insert({
		user_id: id,
		caster_name: data.name
	});
	if (error) {
		await sa.auth.admin.deleteUser(id);
		throw new Error(error.code === "23505" ? "Team name already taken" : friendly(error.message));
	}
	return { ok: true };
});
var updateAmbassador_createServerFn_handler = createServerRpc({
	id: "a04e5a2bd632acf21fcc623a7ad4a3c0416ce77c4f14418406b2118e531a3f88",
	name: "updateAmbassador",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => updateAmbassador.__executeServer(opts));
var updateAmbassador = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	id: stringType().uuid(),
	team_name: stringType().trim().min(2).max(40),
	starting_points: numberType().int().min(0).max(1e7)
}).parse(d)).handler(updateAmbassador_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { data: st } = await sa.from("auction_state").select("status").eq("id", 1).single();
	const patch = {
		team_name: data.team_name,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	if (st?.status === "not_started") {
		patch.starting_points = data.starting_points;
		patch.remaining_points = data.starting_points;
	}
	const { error } = await sa.from("ambassadors").update(patch).eq("id", data.id);
	if (error) throw new Error(error.code === "23505" ? "Team name already taken" : friendly(error.message));
	return {
		ok: true,
		pointsChanged: st?.status === "not_started"
	};
});
var updateSettings_createServerFn_handler = createServerRpc({
	id: "cc7fbdf9c13cf2d4f2323d964c050e4d1d3222fda15b3b76a13f8df84c7a414f",
	name: "updateSettings",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => updateSettings.__executeServer(opts));
var updateSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	tournament_name: stringType().trim().min(2).max(60),
	base_price: numberType().int().min(1),
	min_increment: numberType().int().min(1),
	default_starting_points: numberType().int().min(0).max(1e7),
	retain_price: numberType().int().min(0),
	max_retains: numberType().int().min(0).max(10),
	max_players: numberType().int().min(1).max(1e3),
	max_ambassadors: numberType().int().min(1).max(100),
	max_casters: numberType().int().min(1).max(20),
	apply_points_to_all: booleanType()
}).parse(d)).handler(updateSettings_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { apply_points_to_all, ...rest } = data;
	const { data: st } = await sa.from("auction_state").select("status").eq("id", 1).single();
	const { error } = await sa.from("auction_state").update({
		...rest,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", 1);
	if (error) throw new Error(friendly(error.message));
	if (apply_points_to_all) {
		if (st?.status !== "not_started") throw new Error("Settings saved, but team points can only be reset before the auction starts");
		await sa.from("ambassadors").update({
			starting_points: data.default_starting_points,
			remaining_points: data.default_starting_points
		}).gte("starting_points", 0);
	}
	return { ok: true };
});
var adminRemovePlayer_createServerFn_handler = createServerRpc({
	id: "54af237156162ebd881271cb0560617d0ba2dcc36a7c078d64b06323ad28c5b7",
	name: "adminRemovePlayer",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => adminRemovePlayer.__executeServer(opts));
var adminRemovePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ playerId: stringType().uuid() }).parse(d)).handler(adminRemovePlayer_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { data: pl } = await sa.from("players").select("status").eq("id", data.playerId).maybeSingle();
	if (!pl) throw new Error("Player not found");
	if (!["pool", "unsold"].includes(pl.status)) throw new Error("Only pool or unsold players can be removed");
	const { error } = await sa.from("players").delete().eq("id", data.playerId);
	if (error) throw new Error(friendly(error.message));
	return { ok: true };
});
var adminRequeuePlayer_createServerFn_handler = createServerRpc({
	id: "f1a6105f42ea9e035ccb5cf29bb117599f887d66254df75e860f7abfb39767be",
	name: "adminRequeuePlayer",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => adminRequeuePlayer.__executeServer(opts));
var adminRequeuePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ playerId: stringType().uuid() }).parse(d)).handler(adminRequeuePlayer_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const { data: pl } = await sa.from("players").select("status").eq("id", data.playerId).maybeSingle();
	if (!pl || pl.status !== "unsold") throw new Error("Only unsold players can be requeued");
	await sa.from("auction_results").delete().eq("player_id", data.playerId).eq("status", "unsold");
	const { error } = await sa.from("players").update({
		status: "pool",
		lot_number: null,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", data.playerId);
	if (error) throw new Error(friendly(error.message));
	return { ok: true };
});
var setCasterCam_createServerFn_handler = createServerRpc({
	id: "dc8b24f9f3512df4e26f41c8b1692b7334a03f8b259575bce7e8597143c69c9a",
	name: "setCasterCam",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => setCasterCam.__executeServer(opts));
var setCasterCam = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	url: stringType().url().max(500).or(literalType("")).optional(),
	live: booleanType().optional()
}).parse(d)).handler(setCasterCam_createServerFn_handler, async ({ data, context }) => {
	await requireRole(context, ["caster", "admin"]);
	const sa = await admin();
	const patch = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
	if (data.url !== void 0) patch.caster_stream_url = data.url || null;
	if (data.live !== void 0) patch.caster_cam_live = data.live;
	const { error } = await sa.from("auction_state").update(patch).eq("id", 1);
	if (error) throw new Error(friendly(error.message));
	return { ok: true };
});
var systemStatus_createServerFn_handler = createServerRpc({
	id: "e261fd106c609ec43dbeddf2fddc9312487736fcd8602effd252a4a6e3354cb2",
	name: "systemStatus",
	filename: "src/lib/accounts.functions.ts"
}, (opts) => systemStatus.__executeServer(opts));
var systemStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(systemStatus_createServerFn_handler, async ({ context }) => {
	await requireRole(context, ["admin"]);
	const sa = await admin();
	const t = Date.now();
	const { error } = await sa.from("auction_state").select("id").eq("id", 1).single();
	const { data: buckets } = await sa.storage.listBuckets();
	return {
		database: error ? "error" : "connected",
		latencyMs: Date.now() - t,
		buckets: (buckets ?? []).map((b) => ({
			name: b.name,
			public: b.public
		}))
	};
});
//#endregion
export { adminExists_createServerFn_handler, adminRemovePlayer_createServerFn_handler, adminRequeuePlayer_createServerFn_handler, bootstrapAdmin_createServerFn_handler, changeUsername_createServerFn_handler, createStaff_createServerFn_handler, listUsers_createServerFn_handler, registerPlayer_createServerFn_handler, resetUserPassword_createServerFn_handler, seedDefaultAccounts_createServerFn_handler, setCasterCam_createServerFn_handler, setUserActive_createServerFn_handler, systemStatus_createServerFn_handler, updateAmbassador_createServerFn_handler, updateSettings_createServerFn_handler, verifyLogin_createServerFn_handler };
