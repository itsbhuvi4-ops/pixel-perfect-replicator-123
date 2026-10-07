import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanupCasterLeases = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (state?.casterLeaseUntil && state.casterLeaseUntil <= now) {
      await ctx.db.patch(state._id, {
        casterOwnerId: null,
        casterSessionId: null,
        casterHeartbeatAt: null,
        casterLeaseUntil: null,
        casterCamLive: false,
        updatedAt: now,
      });
    }

    const sessions = await ctx.db.query("casterSessions").withIndex("by_state", q => q.eq("state", "live")).collect();
    for (const session of sessions) {
      if (session.leaseUntil <= now) {
        await ctx.db.patch(session._id, { state: "expired", updatedAt: now });
      }
    }
    return null;
  },
});

export const repairAuctionDeadline = internalMutation({
  args: {},
  handler: async ctx => {
    const state = await ctx.db.query("auctionState").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (!state?.biddingOpen || !state.biddingDeadlineAt || state.biddingDeadlineAt > Date.now()) return null;
    await ctx.scheduler.runAfter(0, { __path: "auction:finalizeExpired" } as never, { stateId: state._id });
    return null;
  },
});
