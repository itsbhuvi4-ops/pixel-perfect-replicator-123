import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./authz";

export const mine = query({
  args: {},
  handler: async ctx => {
    const user = await requireUser(ctx);
    return ctx.db.query("notifications").withIndex("by_user_id", q => q.eq("userId", user._id)).order("desc").take(100);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) throw new Error("Notification not found");
    await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    return null;
  },
});
