import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireIdentity } from "./authz";

export const bootstrapFirstAdmin = mutation({
  args: { username: v.string(), displayName: v.optional(v.string()), setupCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const expected = process.env.BIDX_ADMIN_SETUP_CODE;
    if (!expected || args.setupCode !== expected) throw new Error("Invalid setup code");

    const existingAdmins = await ctx.db.query("userRoles")
      .withIndex("by_role", q => q.eq("role", "admin")).take(1);
    if (existingAdmins.length > 0) throw new Error("First-admin setup is already complete");

    const now = Date.now();
    let user = await ctx.db.query("users")
      .withIndex("by_clerk_user_id", q => q.eq("clerkUserId", identity.subject)).unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        username: args.username,
        displayName: args.displayName,
        isActive: true,
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw new Error("Unable to create user");
    return ctx.db.insert("userRoles", { userId: user._id, role: "admin", createdAt: now });
  },
});
