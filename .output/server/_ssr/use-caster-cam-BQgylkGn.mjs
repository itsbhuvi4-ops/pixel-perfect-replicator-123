import { n as __toESM } from "../_runtime.mjs";
import { a as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { i as watchCasterCam } from "./LiveTicker-DB9Eh8PD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-caster-cam-BQgylkGn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/** Viewer hook: joins the WebRTC caster cam while `enabled` (usually auction live + cam flag). */
function useCasterCamStream(enabled) {
	const [stream, setStream] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)("idle");
	(0, import_react.useEffect)(() => {
		if (!enabled) {
			setStream(null);
			setStatus("idle");
			return;
		}
		return watchCasterCam(setStream, setStatus);
	}, [enabled]);
	return {
		stream,
		status
	};
}
//#endregion
export { useCasterCamStream as t };
