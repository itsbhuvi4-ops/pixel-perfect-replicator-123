import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireIdentity } from "./authz";

const role = v.union(v.literal("admin"), v.literal("caster"), v.literal("ambassador"), v.literal("player"));

export const syncCurrentUser = mutation({
  args: { username: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const existing = await ctx.db.query("users")
      .withIndex("by_clerk_user_id", q => q.eq("clerkUserId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        displayName: args.displayName ?? existing.displayName,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkUserId: identity.subject,
      username: args.username,
      displayName: args.displayName,
      isActive: true,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_user_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) return null;
    const roles = await ctx.db.query("userRoles")
      .withIndex("by_user_id", q => q.eq("userId", user._id))
      .collect();
    return { ...user, roles: roles.map(r => r.role) };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return Promise.all(users.map(async user => ({
      ...user,
      roles: (await ctx.db.query("userRoles")
        .withIndex("by_user_id", q => q.eq("userId", user._id))
        .collect()).map(r => r.role),
    })));
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("userRoles")
      .withIndex("by_user_and_role", q => q.eq("userId", args.userId).eq("role", args.role))
      .unique();
    if (existing) return existing._id;
    return ctx.db.insert("userRoles", { userId: args.userId, role: args.role, createdAt: Date.now() });
  },
});

export const removeRole = mutation({
  args: { userId: v.id("users"), role },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("userRoles")
      .withIndex("by_user_and_role", q => q.eq("userId", args.userId).eq("role", args.role))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
