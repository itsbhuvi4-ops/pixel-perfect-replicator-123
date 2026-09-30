//#region node_modules/.nitro/vite/services/ssr/assets/format-Dl7fjJRF.js
function money(value) {
	if (value === null || value === void 0) return "—";
	return `${new Intl.NumberFormat("en-IN").format(value)} pts`;
}
function plainPoints(value) {
	if (value === null || value === void 0) return "—";
	return new Intl.NumberFormat("en-IN").format(value);
}
var ROLE_LABELS = {
	primary_rusher: "Primary Rusher",
	secondary_rusher: "Secondary Rusher",
	sniper: "Sniper",
	nader: "Nader",
	supporter: "Supporter"
};
var GAME_ROLES = [
	"primary_rusher",
	"secondary_rusher",
	"sniper",
	"nader",
	"supporter"
];
function initials(name) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
function usernameToEmail(username) {
	return `${username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "-")}@auction.local`;
}
function statusLabel(s) {
	return {
		not_started: "IDLE",
		live: "LIVE",
		paused: "PAUSED",
		stopped: "STOPPED",
		completed: "COMPLETED"
	}[s ?? ""] ?? "IDLE";
}
function pts(value) {
	if (value === null || value === void 0) return "—";
	return `${new Intl.NumberFormat("en-IN").format(value)} pts`;
}
//#endregion
export { plainPoints as a, usernameToEmail as c, money as i, ROLE_LABELS as n, pts as o, initials as r, statusLabel as s, GAME_ROLES as t };
