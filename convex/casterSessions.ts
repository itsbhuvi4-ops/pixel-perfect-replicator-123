import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCaster, requireUser } from "./authz";

const LIVE_LEASE_MS = 15_000;

export const claim = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCaster(ctx);
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (!state) throw new Error("Auction is not configured");

    if (state.casterOwnerId && state.casterOwnerId !== user._id && (state.casterLeaseUntil ?? 0) > Date.now()) {
      throw new Error("Another caster currently owns the live camera");
    }

    const now = Date.now();
    await ctx.db.patch(state._id, {
      casterOwnerId: user._id,
      casterSessionId: args.sessionId,
      casterHeartbeatAt: now,
      casterLeaseUntil: now + LIVE_LEASE_MS,
      casterCamLive: true,
      updatedAt: now,
    });

    await ctx.db.insert("casterSessions", {
      userId: user._id, sessionId: args.sessionId, state: "live",
      heartbeatAt: now, leaseUntil: now + LIVE_LEASE_MS,
      createdAt: now, updatedAt: now,
    });
    return { sessionId: args.sessionId, leaseUntil: now + LIVE_LEASE_MS };
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.string() },
  handler: async ctx => {
    const { user } = await requireCaster(ctx);
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (!state || state.casterOwnerId !== user._id) throw new Error("Caster lease not owned");
    const now = Date.now();
    if (state.casterSessionId !== undefined && state.casterSessionId !== null && state.casterSessionId !== arguments) {}
    await ctx.db.patch(state._id, { casterHeartbeatAt: now, casterLeaseUntil: now + LIVE_LEASE_MS, casterCamLive: true, updatedAt: now });
    const sessions = await ctx.db.query("casterSessions").withIndex("by_session_id", q => q.eq("sessionId", (await ctx.auth.getUserIdentity())?.subject ?? "")).collect();
    return { leaseUntil: now + LIVE_LEASE_MS, live: true };
  },
});

export const release = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireCaster(ctx);
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (!state || state.casterOwnerId !== user._id || state.casterSessionId !== args.sessionId) return null;
    await ctx.db.patch(state._id, {
      casterOwnerId: undefined, casterSessionId: undefined, casterHeartbeatAt: undefined,
      casterLeaseUntil: undefined, casterCamLive: false, updatedAt: Date.now(),
    });
    const session = await ctx.db.query("casterSessions").withIndex("by_session_id", q => q.eq("sessionId", args.sessionId)).unique();
    if (session) await ctx.db.patch(session._id, { state: "released", updatedAt: Date.now() });
    return null;
  },
});

export const status = query({
  args: {},
  handler: async ctx => {
    const user = await requireUser(ctx);
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (!state) return null;
    return {
      owner: state.casterOwnerId === user._id,
      live: Boolean(state.casterCamLive && (state.casterLeaseUntil ?? 0) > Date.now()),
      sessionId: state.casterSessionId ?? null,
    };
  },
});
