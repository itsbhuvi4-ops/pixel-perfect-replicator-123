import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requirePlayer } from "./authz";

export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    await requirePlayer(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const attachPlayerMedia = mutation({
  args: {
    playerId: v.id("players"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("photo"), v.literal("video")),
    sizeBytes: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requirePlayer(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player || player.userId !== user._id) throw new Error("Player not found");

    const max = args.kind === "photo" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (args.sizeBytes <= 0 || args.sizeBytes > max) throw new Error("File size exceeds the allowed limit");

    const allowed = args.kind === "photo"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(args.contentType)) throw new Error("Unsupported media type");

    const previous = await ctx.db.query("playerMedia")
      .withIndex("by_player_and_kind", q => q.eq("playerId", player._id).eq("kind", args.kind))
      .collect();

    for (const item of previous) {
      await ctx.db.delete(item._id);
      try { await ctx.storage.delete(item.storageId); } catch {}
    }

    await ctx.db.insert("playerMedia", {
      playerId: player._id, storageId: args.storageId, kind: args.kind,
      sizeBytes: args.sizeBytes, contentType: args.contentType, createdAt: Date.now(),
    });

    await ctx.db.patch(player._id, {
      ...(args.kind === "photo" ? { photoStorageId: args.storageId } : { videoStorageId: args.storageId }),
      updatedAt: Date.now(),
    });

    return { url: await ctx.storage.getUrl(args.storageId) };
  },
});
