//#region node_modules/.nitro/vite/services/ssr/assets/__23tanstack-start-server-fn-resolver-CiXB7b4h.js
var manifest = {
	"187516672e44f284520ad54d8296517aeccb76c9f5baaaa706b79befa7842fc9": {
		functionName: "verifyLogin_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"54af237156162ebd881271cb0560617d0ba2dcc36a7c078d64b06323ad28c5b7": {
		functionName: "adminRemovePlayer_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"6687b5862735cdb048f8a10c652352f47ff2a8b866ef1d9240d573cbb7544b17": {
		functionName: "createStaff_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"681f5a4353603fef0ba78844636c0810dcc433879cea82d80405f063d30dc2d7": {
		functionName: "resetUserPassword_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"8c9a05e86585be9d4fcc299b869fc1e68acfae4320291e85282a1ad3da47a5d8": {
		functionName: "setUserActive_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"91295bbee4fe3cc52c95dc092384decd4deb98543c704888bbeeef4e7c511718": {
		functionName: "seedDefaultAccounts_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"9df7d613f47b3a4bde07bc5290e9450ee3882f0fb02a6a3099a37b3a4913ef19": {
		functionName: "registerPlayer_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"a04e5a2bd632acf21fcc623a7ad4a3c0416ce77c4f14418406b2118e531a3f88": {
		functionName: "updateAmbassador_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"a4804d8ce3fb791b76bd5497fbe6d64880483a463be9a81f311f49da914b311e": {
		functionName: "changeUsername_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"cae8c00623ff8792b2fd5737142e3ecc564c65bbc278c6ce17817b41bc7af529": {
		functionName: "bootstrapAdmin_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"cc7fbdf9c13cf2d4f2323d964c050e4d1d3222fda15b3b76a13f8df84c7a414f": {
		functionName: "updateSettings_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"d84bb0630a88e021269646cb51e5391a66f221178b45f48a40bfe1285239bc6b": {
		functionName: "listUsers_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"dc8b24f9f3512df4e26f41c8b1692b7334a03f8b259575bce7e8597143c69c9a": {
		functionName: "setCasterCam_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"e261fd106c609ec43dbeddf2fddc9312487736fcd8602effd252a4a6e3354cb2": {
		functionName: "systemStatus_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"e5b68d0b51507f55fef9d795077b7b36d3109cdaa2608ddce017d9abd60c79d2": {
		functionName: "adminExists_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	},
	"f1a6105f42ea9e035ccb5cf29bb117599f887d66254df75e860f7abfb39767be": {
		functionName: "adminRequeuePlayer_createServerFn_handler",
		importer: () => import("./_ssr/accounts.functions-C_F0Fs-8.mjs")
	}
};
async function getServerFnById(id, access) {
	const serverFnInfo = manifest[id];
	if (!serverFnInfo) throw new Error("Server function info not found for " + id);
	const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
	if (!fnModule) throw new Error("Server function module not resolved for " + id);
	const action = fnModule[serverFnInfo.functionName];
	if (!action) throw new Error("Server function module export not resolved for serverFn ID: " + id);
	return action;
}
//#endregion
export { getServerFnById as t };
