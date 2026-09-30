import { n as __toESM } from "../_runtime.mjs";
import { k as isRedirect, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-BFFE07zL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-UH_Jp6hR.mjs";
import { a as objectType, i as numberType, n as enumType, o as stringType, r as literalType, t as booleanType } from "../_libs/zod.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-CiXB7b4h.mjs";
import { a as require_react } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/accounts.functions-zdl0Unbb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
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
var registerPlayer = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	username,
	password,
	player_name: stringType().trim().min(2).max(60),
	uid: stringType().trim().min(3).max(40),
	game_name: stringType().trim().min(2).max(40),
	primary_role: roleEnum
}).parse(d)).handler(createSsrRpc("9df7d613f47b3a4bde07bc5290e9450ee3882f0fb02a6a3099a37b3a4913ef19"));
var adminExists = createServerFn({ method: "GET" }).handler(createSsrRpc("e5b68d0b51507f55fef9d795077b7b36d3109cdaa2608ddce017d9abd60c79d2"));
var bootstrapAdmin = createServerFn({ method: "POST" }).inputValidator((d) => objectType({
	username,
	password
}).parse(d)).handler(createSsrRpc("cae8c00623ff8792b2fd5737142e3ecc564c65bbc278c6ce17817b41bc7af529"));
/** Confirms the chosen role against the database after sign-in. */
var verifyLogin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ role: enumType([
	"admin",
	"caster",
	"ambassador",
	"player"
]) }).parse(d)).handler(createSsrRpc("187516672e44f284520ad54d8296517aeccb76c9f5baaaa706b79befa7842fc9"));
var changeUsername = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ username }).parse(d)).handler(createSsrRpc("a4804d8ce3fb791b76bd5497fbe6d64880483a463be9a81f311f49da914b311e"));
var listUsers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("d84bb0630a88e021269646cb51e5391a66f221178b45f48a40bfe1285239bc6b"));
var setUserActive = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	userId: stringType().uuid(),
	active: booleanType()
}).parse(d)).handler(createSsrRpc("8c9a05e86585be9d4fcc299b869fc1e68acfae4320291e85282a1ad3da47a5d8"));
var resetUserPassword = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ userId: stringType().uuid() }).parse(d)).handler(createSsrRpc("681f5a4353603fef0ba78844636c0810dcc433879cea82d80405f063d30dc2d7"));
var seedDefaultAccounts = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("91295bbee4fe3cc52c95dc092384decd4deb98543c704888bbeeef4e7c511718"));
var createStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	username,
	password,
	role: enumType(["caster", "ambassador"]),
	name: stringType().trim().min(2).max(60),
	team_name: stringType().trim().max(40).optional()
}).parse(d)).handler(createSsrRpc("6687b5862735cdb048f8a10c652352f47ff2a8b866ef1d9240d573cbb7544b17"));
var updateAmbassador = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	id: stringType().uuid(),
	team_name: stringType().trim().min(2).max(40),
	starting_points: numberType().int().min(0).max(1e7)
}).parse(d)).handler(createSsrRpc("a04e5a2bd632acf21fcc623a7ad4a3c0416ce77c4f14418406b2118e531a3f88"));
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
}).parse(d)).handler(createSsrRpc("cc7fbdf9c13cf2d4f2323d964c050e4d1d3222fda15b3b76a13f8df84c7a414f"));
var adminRemovePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ playerId: stringType().uuid() }).parse(d)).handler(createSsrRpc("54af237156162ebd881271cb0560617d0ba2dcc36a7c078d64b06323ad28c5b7"));
var adminRequeuePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({ playerId: stringType().uuid() }).parse(d)).handler(createSsrRpc("f1a6105f42ea9e035ccb5cf29bb117599f887d66254df75e860f7abfb39767be"));
var setCasterCam = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => objectType({
	url: stringType().url().max(500).or(literalType("")).optional(),
	live: booleanType().optional()
}).parse(d)).handler(createSsrRpc("dc8b24f9f3512df4e26f41c8b1692b7334a03f8b259575bce7e8597143c69c9a"));
var systemStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("e261fd106c609ec43dbeddf2fddc9312487736fcd8602effd252a4a6e3354cb2"));
//#endregion
export { verifyLogin as _, changeUsername as a, registerPlayer as c, setCasterCam as d, setUserActive as f, useServerFn as g, updateSettings as h, bootstrapAdmin as i, resetUserPassword as l, updateAmbassador as m, adminRemovePlayer as n, createStaff as o, systemStatus as p, adminRequeuePlayer as r, listUsers as s, adminExists as t, seedDefaultAccounts as u };
