import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./authz";

export const get = query({
  args: {},
  handler: async ctx => ctx.db.query("appSettings").withIndex("by_key", q => q.eq("key", "primary")).unique(),
});

export const update = mutation({
  args: {
    maintenanceMode: v.boolean(),
    allowPlayerRegistration: v.boolean(),
    allowAmbassadorRegistration: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("appSettings").withIndex("by_key", q => q.eq("key", "primary")).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("appSettings", { key: "primary", ...args, updatedAt: Date.now() });
  },
});
