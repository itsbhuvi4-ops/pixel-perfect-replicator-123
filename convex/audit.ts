import { query } from "./_generated/server";
import { requireAdmin } from "./authz";

export const recent = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    return ctx.db.query("auditEvents").withIndex("by_created_at").order("desc").take(200);
  },
});
