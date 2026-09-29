import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const username = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscore only");
const password = z.string().min(8).max(72);
const toEmail = (u: string) => `${u.trim().toLowerCase()}@auction.local`;
const roleEnum = z.enum(["primary_rusher", "secondary_rusher", "sniper", "nader", "supporter"]);

async function createAccount(u: string, p: string, role: "admin" | "caster" | "ambassador" | "player") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const uname = u.trim().toLowerCase();
  const { data: taken } = await supabaseAdmin.from("profiles").select("id").eq("username", uname).maybeSingle();
  if (taken) throw new Error("Already Registered");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: toEmail(uname),
    password: p,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message.includes("already") ? "Already Registered" : error?.message ?? "Could not create account");
  const id = data.user.id;
  const { error: pe } = await supabaseAdmin.from("profiles").insert({ id, username: uname });
  if (pe) {
    await supabaseAdmin.auth.admin.deleteUser(id);
    throw new Error("Already Registered");
  }
  await supabaseAdmin.from("user_roles").insert({ user_id: id, role });
  return { id, supabaseAdmin };
}

export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        username,
        password,
        player_name: z.string().trim().min(2).max(60),
        ingame_name: z.string().trim().min(2).max(40),
        game_id: z.string().trim().min(3).max(40),
        primary_role: roleEnum,
        secondary_role: roleEnum.nullable(),
        info: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const { data: dupe } = await sa.from("players").select("id").eq("game_id", data.game_id).maybeSingle();
    if (dupe) throw new Error("Already Registered");
    const { data: st } = await sa.from("auction_state").select("max_players").eq("id", 1).single();
    const { count } = await sa.from("players").select("id", { count: "exact", head: true });
    if (st && (count ?? 0) >= st.max_players) throw new Error("Player registration is full");
    const { id, supabaseAdmin } = await createAccount(data.username, data.password, "player");
    const { error } = await supabaseAdmin.from("players").insert({
      user_id: id,
      player_name: data.player_name,
      ingame_name: data.ingame_name,
      game_id: data.game_id,
      primary_role: data.primary_role,
      secondary_role: data.secondary_role,
      info: data.info ?? null,
    });
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(id);
      throw new Error(error.code === "23505" ? "Already Registered" : error.message);
    }
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username, password }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    await createAccount(data.username, data.password, "admin");
    return { ok: true };
  });

async function requireRole(ctx: { supabase: any; userId: string }, allowed: string[]) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r: string) => allowed.includes(r))) throw new Error("Not allowed");
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username,
        password,
        role: z.enum(["caster", "ambassador"]),
        ambassador_name: z.string().trim().max(60).optional(),
        team_name: z.string().trim().max(40).optional(),
        starting_points: z.number().int().min(0).max(1_000_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
    const { data: st } = await sa.from("auction_state").select("*").eq("id", 1).single();
    if (data.role === "ambassador") {
      if (!data.ambassador_name || !data.team_name) throw new Error("Name and team name required");
      if (st?.status !== "not_started") throw new Error("Ambassadors must be added before the auction starts");
      const { count } = await sa.from("ambassadors").select("id", { count: "exact", head: true });
      if (st && (count ?? 0) >= st.max_ambassadors) throw new Error("Ambassador limit reached");
    } else {
      const { count } = await sa.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "caster");
      if (st && (count ?? 0) >= st.max_casters) throw new Error("Caster limit reached");
    }
    const { id, supabaseAdmin } = await createAccount(data.username, data.password, data.role);
    if (data.role === "ambassador") {
      const pts = data.starting_points ?? 0;
      const { error } = await supabaseAdmin.from("ambassadors").insert({
        user_id: id,
        ambassador_name: data.ambassador_name!,
        team_name: data.team_name!,
        starting_points: pts,
        remaining_points: pts,
      });
      if (error) {
        await supabaseAdmin.auth.admin.deleteUser(id);
        throw new Error(error.code === "23505" ? "Team name already taken" : error.message);
      }
    }
    return { ok: true };
  });

export const setStreamUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(500).or(z.literal("")) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["caster", "admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("auction_state")
      .update({ caster_stream_url: data.url || null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
