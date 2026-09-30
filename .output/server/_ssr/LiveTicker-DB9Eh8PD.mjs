import { n as __toESM } from "../_runtime.mjs";
import { n as ROLE_LABELS } from "./format-Dl7fjJRF.mjs";
import { a as require_react, i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as supabase } from "./client-HdB8tHn7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LiveTicker-DB9Eh8PD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* WebRTC caster cam: the caster's camera + microphone are streamed
* peer-to-peer to every viewer. Signaling (offers, answers, ICE) runs over a
* Supabase Realtime broadcast channel, so no media or credentials ever touch
* an extra server. One streamer, N viewers (mesh — fine for auction rooms).
*/
var CAM_CHANNEL = "bidx-caster-cam";
var ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
var me = () => crypto.randomUUID();
async function send(channel, payload) {
	if (!channel) return;
	channel.send({
		type: "broadcast",
		event: "signal",
		payload
	});
}
function targets(payload, id) {
	return !!payload && "to" in payload && payload.to === id;
}
/** Caster side: publish a local MediaStream to every viewer who asks. */
function startCasterBroadcast(stream, onStatus) {
	const id = me();
	const peers = /* @__PURE__ */ new Map();
	let channel = null;
	let stopped = false;
	const viewerCount = () => onStatus("live", peers.size);
	const drop = (viewer) => {
		peers.get(viewer)?.close();
		peers.delete(viewer);
		viewerCount();
	};
	const connect = async (viewer) => {
		if (stopped || !channel) return;
		drop(viewer);
		const pc = new RTCPeerConnection(ICE_CONFIG);
		peers.set(viewer, pc);
		for (const track of stream.getTracks()) pc.addTrack(track, stream);
		pc.onicecandidate = (e) => {
			if (e.candidate && channel) send(channel, {
				kind: "ice",
				from: id,
				to: viewer,
				candidate: e.candidate.toJSON()
			});
		};
		pc.onconnectionstatechange = () => {
			if ([
				"failed",
				"closed",
				"disconnected"
			].includes(pc.connectionState)) drop(viewer);
		};
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		send(channel, {
			kind: "offer",
			from: id,
			to: viewer,
			sdp: offer.sdp
		});
		viewerCount();
	};
	onStatus("connecting");
	channel = supabase.channel(CAM_CHANNEL, { config: {
		broadcast: { self: false },
		presence: { key: id }
	} }).on("broadcast", { event: "signal" }, async ({ payload }) => {
		if (stopped || !targets(payload, id)) return;
		if (payload.kind === "hello") await connect(payload.from);
		else if (payload.kind === "answer") {
			const pc = peers.get(payload.from);
			if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription({
				type: "answer",
				sdp: payload.sdp
			}).catch(() => {});
		} else if (payload.kind === "ice") {
			const pc = peers.get(payload.from);
			if (pc) await pc.addIceCandidate(payload.candidate).catch(() => {});
		}
	}).subscribe((status) => {
		if (status === "SUBSCRIBED") {
			onStatus("live", 0);
			channel?.track({ role: "caster" });
		} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus("error");
	});
	return () => {
		stopped = true;
		if (channel) send(channel, {
			kind: "bye",
			from: id
		});
		peers.forEach((pc) => pc.close());
		peers.clear();
		if (channel) supabase.removeChannel(channel);
		onStatus("idle");
	};
}
/** Viewer side: subscribe to the live caster cam, if one is streaming. */
function watchCasterCam(onStream, onStatus) {
	const id = me();
	let channel = null;
	let pc = null;
	let helloTimer = null;
	let stopped = false;
	const teardown = () => {
		if (pc) {
			pc.getSenders().forEach((s) => s.track?.stop?.());
			pc.close();
			pc = null;
		}
	};
	onStatus("connecting");
	channel = supabase.channel(CAM_CHANNEL, { config: {
		broadcast: { self: false },
		presence: { key: id }
	} }).on("broadcast", { event: "signal" }, async ({ payload }) => {
		if (stopped || !targets(payload, id)) return;
		if (payload.kind === "offer") {
			teardown();
			pc = new RTCPeerConnection(ICE_CONFIG);
			pc.ontrack = (e) => {
				if (e.streams[0]) onStream(e.streams[0]);
			};
			pc.onicecandidate = (e) => {
				if (e.candidate && channel) send(channel, {
					kind: "ice",
					from: id,
					to: payload.from,
					candidate: e.candidate.toJSON()
				});
			};
			pc.onconnectionstatechange = () => {
				if (pc?.connectionState === "connected") {
					onStatus("live");
					if (helloTimer) clearTimeout(helloTimer);
				} else if ([
					"failed",
					"disconnected",
					"closed"
				].includes(pc?.connectionState ?? "")) {
					onStream(null);
					onStatus("connecting");
					ask();
				}
			};
			await pc.setRemoteDescription({
				type: "offer",
				sdp: payload.sdp
			});
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			send(channel, {
				kind: "answer",
				from: id,
				to: payload.from,
				sdp: answer.sdp
			});
		} else if (payload.kind === "ice" && pc) await pc.addIceCandidate(payload.candidate).catch(() => {});
		else if (payload.kind === "bye") {
			onStream(null);
			onStatus("ended");
		}
	}).subscribe((status) => {
		if (stopped) return;
		if (status === "SUBSCRIBED") {
			ask();
			channel?.track({ role: "viewer" });
		} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus("error");
	});
	const ask = () => {
		if (stopped || !channel) return;
		send(channel, {
			kind: "hello",
			from: id
		});
		helloTimer = setTimeout(ask, 5e3);
	};
	return () => {
		stopped = true;
		if (helloTimer) clearTimeout(helloTimer);
		teardown();
		if (channel) supabase.removeChannel(channel);
		onStream(null);
		onStatus("idle");
	};
}
/** Shared hook plumbing: binds a MediaStream to a <video> element. */
function attachStream(el, stream) {
	if (!el) return;
	if (el.srcObject !== stream) el.srcObject = stream;
	if (stream) el.play().catch(() => {});
}
function CasterCamPip({ stream, embedUrl, large }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => attachStream(ref.current, stream), [stream]);
	if (!stream && !embedUrl) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: large ? "absolute top-4 right-4 w-40 overflow-hidden rounded-xl bg-panel ring-1 ring-gold/50 sm:w-52" : "absolute top-3 right-3 w-28 overflow-hidden rounded-xl bg-panel ring-1 ring-gold/40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "aspect-square",
			children: stream ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref,
				autoPlay: true,
				playsInline: true,
				muted: true,
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
				src: embedUrl,
				title: "Caster face cam",
				allow: "autoplay; encrypted-media; picture-in-picture",
				className: "size-full"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "label-cond flex items-center justify-center gap-1 bg-black/60 py-0.5 text-center text-[9px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "live-dot size-1 rounded-full bg-alert" }), "Caster Cam"]
		})]
	});
}
function PlayerStage({ player, state, camStream }) {
	const embed = state?.caster_stream_url ?? null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative aspect-video overflow-hidden rounded-xl bg-panel2 outline-1 -outline-offset-1 outline-line",
		children: [
			player?.video_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				src: player.video_url,
				poster: player.photo_url ?? void 0,
				controls: true,
				playsInline: true,
				className: "absolute inset-0 size-full object-cover"
			}, player.id) : player?.photo_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: player.photo_url,
				alt: player.ingame_name,
				className: "absolute inset-0 size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 grid place-items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "label-cond text-[12px] text-mut",
					children: player ? "No media uploaded" : "Waiting for the next player"
				})
			}),
			player && state?.status === "live" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "label-cond absolute top-3 left-3 bg-alert px-2 py-0.5 text-[11px] text-white",
				children: ["Live Lot ", player.lot_number ?? ""]
			}),
			state?.status === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "label-cond absolute top-3 left-3 border border-line bg-arena/90 px-2 py-0.5 text-[11px] text-mut",
				children: "Paused"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CasterCamPip, {
				stream: camStream ?? null,
				embedUrl: embed
			}),
			player && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-arena/85 px-5 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "label-cond text-[12px] text-gold",
						children: player.player_name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-display text-4xl leading-none md:text-5xl",
						children: player.ingame_name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 font-mono text-[11px] text-mut",
						children: [
							"ID ",
							player.game_id,
							" · ",
							state?.tournament_name
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 flex-wrap justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-cond border border-gold/50 px-2 py-1 text-[11px] text-gold",
						children: ROLE_LABELS[player.primary_role]
					}), player.secondary_role && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "label-cond border border-line px-2 py-1 text-[11px] text-mut",
						children: ROLE_LABELS[player.secondary_role]
					})]
				})]
			})
		]
	});
}
function LiveTicker({ events }) {
	const items = events.length ? events : [{
		id: "idle",
		message: "Waiting for the auction to begin",
		event_type: "IDLE"
	}];
	const line = [...items, ...items];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-11 items-center overflow-hidden border-y border-line bg-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "label-cond shrink-0 bg-alert px-3 py-1.5 text-[11px] text-white",
			children: "Live Feed"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "marquee whitespace-nowrap font-mono text-[12px] text-mut",
			children: line.map((event, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: event.event_type === "PLAYER_SOLD" ? "mx-6 text-sold" : event.event_type === "PLAYER_UNSOLD" ? "mx-6 text-alert" : event.event_type === "BID_PLACED" ? "mx-6 text-gold" : "mx-6",
				children: event.message
			}, `${event.id}-${index}`))
		})]
	});
}
//#endregion
export { watchCasterCam as i, PlayerStage as n, startCasterBroadcast as r, LiveTicker as t };
