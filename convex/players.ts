import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requirePlayer, requireUser } from "./authz";

const gameRole = v.union(
  v.literal("primary_rusher"), v.literal("secondary_rusher"),
  v.literal("sniper"), v.literal("nader"), v.literal("supporter")
);

export const mine = query({
  args: {},
  handler: async ctx => {
    const user = await requireUser(ctx);
    return ctx.db.query("players").withIndex("by_user_id", q => q.eq("userId", user._id)).unique();
  },
});

export const listPublic = query({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query("players").collect();
    return Promise.all(rows.map(async p => ({
      id: p._id,
      player_name: p.playerName,
      ingame_name: p.ingameName,
      game_id: p.gameId,
      primary_role: p.primaryRole,
      secondary_role: p.secondaryRole ?? null,
      info: p.info ?? null,
      experience: p.experience ?? null,
      team_name: p.teamName ?? null,
      status: p.status,
      sold_price: p.soldPrice ?? null,
      ambassador_id: p.ambassadorId ?? null,
      sold_at: p.soldAt ?? null,
      lot_number: p.lotNumber ?? null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      photo_url: p.photoStorageId ? await ctx.storage.getUrl(p.photoStorageId) : null,
      video_url: p.videoStorageId ? await ctx.storage.getUrl(p.videoStorageId) : null,
    })));
  },
});

export const listPublicPool = query({
  args: {},
  handler: async ctx => ctx.db.query("players").withIndex("by_status", q => q.eq("status", "pool")).collect(),
});

export const listAdmin = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    return ctx.db.query("players").collect();
  },
});

export const register = mutation({
  args: {
    playerName: v.string(), ingameName: v.string(), gameId: v.string(),
    primaryRole: gameRole, secondaryRole: v.optional(gameRole),
    info: v.optional(v.string()), experience: v.optional(v.string()), teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requirePlayer(ctx);
    const existing = await ctx.db.query("players").withIndex("by_user_id", q => q.eq("userId", user._id)).unique();
    if (existing) throw new Error("Player registration already exists");
    const now = Date.now();
    return ctx.db.insert("players", { ...args, userId: user._id, status: "pool", createdAt: now, updatedAt: now });
  },
});

export const updateProfile = mutation({
  args: {
    playerId: v.id("players"), playerName: v.optional(v.string()), ingameName: v.optional(v.string()),
    gameId: v.optional(v.string()), primaryRole: v.optional(gameRole), secondaryRole: v.optional(gameRole),
    info: v.optional(v.string()), experience: v.optional(v.string()), teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player || player.userId !== user._id) throw new Error("Player not found");
    const { playerId, ...patch } = args;
    await ctx.db.patch(playerId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

export const deletePlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;
    if (player.status === "sold" || player.status === "retained") throw new Error("Sold or retained players cannot be deleted");
    const contacts = await ctx.db.query("playerContacts").withIndex("by_player_id", q => q.eq("playerId", args.playerId)).collect();
    for (const contact of contacts) await ctx.db.delete(contact._id);
    const media = await ctx.db.query("playerMedia").withIndex("by_player_id", q => q.eq("playerId", args.playerId)).collect();
    for (const item of media) await ctx.db.delete(item._id);
    await ctx.db.delete(args.playerId);
    await ctx.db.insert("auditEvents", {
      actorUserId: user._id, action: "PLAYER_DELETED", targetType: "player",
      targetId: args.playerId, createdAt: Date.now(),
    });
    return null;
  },
});
