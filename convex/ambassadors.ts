import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAmbassador, requireUser } from "./authz";

export const publicList = query({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query("ambassadors").collect();
    return rows.map(a => ({
      id: a._id,
      ambassador_name: a.ambassadorName,
      team_name: a.teamName,
      starting_points: a.startingPoints,
      remaining_points: a.remainingPoints,
      info: a.info ?? null,
    }));
  },
});

export const mine = query({
  args: {},
  handler: async ctx => {
    const user = await requireUser(ctx);
    const profile = await ctx.db.query("ambassadors").withIndex("by_user_id", q => q.eq("userId", user._id)).unique();
    if (!profile) return null;
    const players = await ctx.db.query("players").withIndex("by_ambassador_id", q => q.eq("ambassadorId", profile._id)).collect();
    return { ...profile, players };
  },
});

export const list = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    return ctx.db.query("ambassadors").collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    ambassadorName: v.string(), teamName: v.string(),
    discord: v.optional(v.string()), info: v.optional(v.string()),
    startingPoints: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const existing = await ctx.db.query("ambassadors").withIndex("by_user_id", q => q.eq("userId", args.userId)).unique();
    if (existing) throw new Error("Ambassador profile already exists");
    const now = Date.now();
    return ctx.db.insert("ambassadors", {
      userId: args.userId, ambassadorName: args.ambassadorName, teamName: args.teamName, discord: args.discord, info: args.info, remainingPoints: args.startingPoints, startingPoints: args.startingPoints,
      createdAt: now, updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    ambassadorId: v.id("ambassadors"),
    ambassadorName: v.optional(v.string()), teamName: v.optional(v.string()),
    discord: v.optional(v.string()), info: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const { ambassadorId, ...patch } = args;
    const profile = await ctx.db.get(ambassadorId);
    if (!profile) throw new Error("Ambassador not found");
    await ctx.db.patch(ambassadorId, { ...patch, updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", {
      actorUserId: user._id, action: "AMBASSADOR_UPDATED",
      targetType: "ambassador", targetId: ambassadorId, createdAt: Date.now(),
    });
    return null;
  },
});

export const deleteAmbassador = mutation({
  args: { ambassadorId: v.id("ambassadors") },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const profile = await ctx.db.get(args.ambassadorId);
    if (!profile) return null;
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (state?.currentBidderId === args.ambassadorId && (state.status === "live" || state.status === "paused")) {
      throw new Error("Cannot delete the current bidder during an active auction");
    }
    const players = await ctx.db.query("players").withIndex("by_ambassador_id", q => q.eq("ambassadorId", args.ambassadorId)).collect();
    if (players.some(p => p.status === "sold" || p.status === "retained")) {
      throw new Error("Cannot delete an ambassador who owns sold or retained players");
    }
    const bids = await ctx.db.query("bids").withIndex("by_ambassador_id", q => q.eq("ambassadorId", args.ambassadorId)).collect();
    for (const bid of bids) await ctx.db.delete(bid._id);
    await ctx.db.delete(args.ambassadorId);
    await ctx.db.insert("auditEvents", {
      actorUserId: user._id, action: "AMBASSADOR_DELETED",
      targetType: "ambassador", targetId: args.ambassadorId, createdAt: Date.now(),
    });
    return null;
  },
});

export const roster = query({
  args: { ambassadorId: v.id("ambassadors") },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("players").withIndex("by_ambassador_id", q => q.eq("ambassadorId", args.ambassadorId)).collect();
    return rows.map(p => ({
      id: p._id, player_name: p.playerName, ingame_name: p.ingameName,
      game_id: p.gameId, primary_role: p.primaryRole,
      secondary_role: p.secondaryRole ?? null, status: p.status,
      sold_price: p.soldPrice ?? null, sold_at: p.soldAt ?? null,
      ambassador_id: p.ambassadorId ?? null,
    }));
  },
});
