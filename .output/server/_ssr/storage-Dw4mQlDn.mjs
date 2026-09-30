import { t as supabase } from "./client-HdB8tHn7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/storage-Dw4mQlDn.js
/** Upload a file into a player-owned storage folder and return a long-lived signed URL. */
async function uploadPlayerFile(bucket, uid, file) {
	const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
	const { error } = await supabase.storage.from(bucket).upload(path, file);
	if (error) throw error;
	const { data, error: se } = await supabase.storage.from(bucket).createSignedUrl(path, 31536e4);
	if (se) throw se;
	return data.signedUrl;
}
//#endregion
export { uploadPlayerFile as t };
