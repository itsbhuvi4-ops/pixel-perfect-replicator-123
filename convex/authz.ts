import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type AppCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AppCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  return identity;
}

export async function requireUser(ctx: AppCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db.query("users")
    .withIndex("by_clerk_user_id", q => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user || !user.isActive) throw new Error("Active user account required");
  return user;
}

export async function requireRole(ctx: AppCtx, role: Doc<"userRoles">["role"]) {
  const user = await requireUser(ctx);
  const userRole = await ctx.db.query("userRoles")
    .withIndex("by_user_and_role", q => q.eq("userId", user._id).eq("role", role))
    .unique();
  if (!userRole) throw new Error("Insufficient permissions");
  return { user, role: userRole };
}

export const requireAdmin = (ctx: AppCtx) => requireRole(ctx, "admin");
export const requirePlayer = (ctx: AppCtx) => requireRole(ctx, "player");
export const requireAmbassador = (ctx: AppCtx) => requireRole(ctx, "ambassador");
export const requireCaster = (ctx: AppCtx) => requireRole(ctx, "caster");

export async function requireAnyRole(ctx: AppCtx, roles: Array<Doc<"userRoles">["role"]>) {
  const user = await requireUser(ctx);
  for (const role of roles) {
    const userRole = await ctx.db.query("userRoles")
      .withIndex("by_user_and_role", q => q.eq("userId", user._id).eq("role", role))
      .unique();
    if (userRole) return { user, role: userRole };
  }
  throw new Error("Insufficient permissions");
}

export type UserId = Id<"users">;
