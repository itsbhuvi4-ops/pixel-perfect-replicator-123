import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail } from "@/lib/format";

type Role = "admin" | "caster" | "ambassador" | "player";

const username = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30)
  .regex(/^[a-zA-Z0-9_#.-]+$/, "Username can use letters, numbers, _ # . -");
const password = z.string().min(8, "Password must be at least 8 characters").max(72);
const roleEnum = z.enum(["primary_rusher", "secondary_rusher", "sniper", "nader", "supporter"]);

/** Turn database/raw errors into short, safe messages. */
function friendly(msg: string | undefined): string {
  if (!msg) return "Something went wrong";
  if (/duplicate|already|23505/i.test(msg)) return "Already Registered";
  if (msg.length > 120 || /relation|column|syntax|violates/i.test(msg)) {
    console.error("[accounts]", msg);
    return "Something went wrong. Please try again.";
  }
  return msg;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function createAccount(u: string, p: string, role: Role) {
  const sa = await admin();
  const uname = u.trim();
  const { data: taken } = await sa.from("profiles").select("id").ilike("username", uname).maybeSingle();
  if (taken) throw new Error("Already Registered");
  const { data, error } = await sa.auth.admin.createUser({ email: usernameToEmail(uname), password: p, email_confirm: true });
  if (error || !data.user) throw new Error(friendly(error?.message));
  const id = data.user.id;
  const { error: pe } = await sa.from("profiles").insert({ id, username: uname, display_name: uname });
  if (pe) {
    await sa.auth.admin.deleteUser(id);
    throw new Error("Already Registered");
  }
  await sa.from("user_roles").insert({ user_id: id, role });
  return id;
}

async function rolesOf(ctx: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

async function requireRole(ctx: { supabase: any; userId: string }, allowed: Role[]) {
  const roles = await rolesOf(ctx);
  const { data: prof } = await ctx.supabase.from("profiles").select("is_active").eq("id", ctx.userId).maybeSingle();
  if (!prof?.is_active) throw new Error("Your account is deactivated");
  if (!roles.some((r) => allowed.includes(r as Role))) throw new Error("Not allowed");
}

/* ---------- Public ---------- */

export const registerPlayer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        username,
        password,
        player_name: z.string().trim().min(2).max(60),
        uid: z.string().trim().min(3).max(40),
        game_name: z.string().trim().min(2).max(40),
        primary_role: roleEnum,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sa = await admin();
    const { data: dupe } = await sa.from("players").select("id").eq("game_id", data.uid).maybeSingle();
    if (dupe) throw new Error("Already Registered");
    const id = await createAccount(data.username, data.password, "player");
    const { error } = await sa.from("players").insert({
      user_id: id,
      player_name: data.player_name,
      ingame_name: data.game_name,
      game_id: data.uid,
      primary_role: data.primary_role,
    });
    if (error) {
      await sa.auth.admin.deleteUser(id);
      throw new Error(friendly(error.message));
    }
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const sa = await admin();
  const { count } = await sa.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username, password }).parse(d))
  .handler(async ({ data }) => {
    const sa = await admin();
    const { count } = await sa.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    await createAccount(data.username, data.password, "admin");
    return { ok: true };
  });

/* ---------- Signed in ---------- */

/** Confirms the chosen role against the database after sign-in. */
export const verifyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role: z.enum(["admin", "caster", "ambassador", "player"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const roles = await rolesOf(context);
    const { data: prof } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (!prof?.is_active) return { ok: false, error: "This account is deactivated. Contact the admin." };
    if (!roles.includes(data.role)) return { ok: false, error: "This account doesn't have that role." };
    return { ok: true, error: null };
  });

export const changeUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ username }).parse(d))
  .handler(async ({ data, context }) => {
    const sa = await admin();
    const { data: taken } = await sa.from("profiles").select("id").ilike("username", data.username).maybeSingle();
    if (taken && taken.id !== context.userId) throw new Error("That username is taken");
    const { error } = await sa.auth.admin.updateUserById(context.userId, { email: usernameToEmail(data.username) });
    if (error) throw new Error(friendly(error.message));
    await sa.from("profiles").update({ username: data.username, updated_at: new Date().toISOString() }).eq("id", context.userId);
    return { ok: true };
  });

/* ---------- Admin ---------- */

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      sa.from("profiles").select("id, username, display_name, is_active, created_at").order("created_at"),
      sa.from("user_roles").select("user_id, role"),
    ]);
    return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    if (data.userId === context.userId) throw new Error("You can't deactivate yourself");
    const sa = await admin();
    await sa.from("profiles").update({ is_active: data.active, updated_at: new Date().toISOString() }).eq("id", data.userId);
    await sa.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? "none" : "876000h" });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const pw = randomPassword();
    const { error } = await sa.auth.admin.updateUserById(data.userId, { password: pw });
    if (error) throw new Error(friendly(error.message));
    return { password: pw };
  });

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 55]).join("") + "!7";
}

export const seedDefaultAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: st } = await sa.from("auction_state").select("default_starting_points").eq("id", 1).single();
    const start = st?.default_starting_points ?? 50000;
    const created: { username: string; password: string }[] = [];
    for (let i = 1; i <= 24; i++) {
      const u = `Ambassador#${String(i).padStart(3, "0")}`;
      const { data: exists } = await sa.from("profiles").select("id").ilike("username", u).maybeSingle();
      if (exists) continue;
      const pw = randomPassword();
      const id = await createAccount(u, pw, "ambassador");
      await sa.from("ambassadors").insert({
        user_id: id, ambassador_name: u, team_name: `Team ${String(i).padStart(3, "0")}`,
        starting_points: start, remaining_points: start,
      });
      created.push({ username: u, password: pw });
    }
    for (let i = 1; i <= 2; i++) {
      const u = `Caster#${String(i).padStart(3, "0")}`;
      const { data: exists } = await sa.from("profiles").select("id").ilike("username", u).maybeSingle();
      if (exists) continue;
      const pw = randomPassword();
      const id = await createAccount(u, pw, "caster");
      await sa.from("casters").insert({ user_id: id, caster_name: u });
      created.push({ username: u, password: pw });
    }
    return { created };
  });

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      username, password,
      role: z.enum(["caster", "ambassador"]),
      name: z.string().trim().min(2).max(60),
      team_name: z.string().trim().max(40).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: st } = await sa.from("auction_state").select("*").eq("id", 1).single();
    if (data.role === "ambassador") {
      if (!data.team_name) throw new Error("Team name is required");
      const { count } = await sa.from("ambassadors").select("id", { count: "exact", head: true });
      if (st && (count ?? 0) >= st.max_ambassadors) throw new Error("Ambassador limit reached");
    } else {
      const { count } = await sa.from("casters").select("id", { count: "exact", head: true });
      if (st && (count ?? 0) >= st.max_casters) throw new Error("Caster limit reached");
    }
    const id = await createAccount(data.username, data.password, data.role);
    const { error } =
      data.role === "ambassador"
        ? await sa.from("ambassadors").insert({
            user_id: id, ambassador_name: data.name, team_name: data.team_name!,
            starting_points: st?.default_starting_points ?? 50000, remaining_points: st?.default_starting_points ?? 50000,
          })
        : await sa.from("casters").insert({ user_id: id, caster_name: data.name });
    if (error) {
      await sa.auth.admin.deleteUser(id);
      throw new Error(error.code === "23505" ? "Team name already taken" : friendly(error.message));
    }
    return { ok: true };
  });

export const updateAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), team_name: z.string().trim().min(2).max(40), starting_points: z.number().int().min(0).max(10_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: st } = await sa.from("auction_state").select("status").eq("id", 1).single();
    const patch: { team_name: string; updated_at: string; starting_points?: number; remaining_points?: number } = { team_name: data.team_name, updated_at: new Date().toISOString() };
    if (st?.status === "not_started") {
      patch.starting_points = data.starting_points;
      patch.remaining_points = data.starting_points;
    }
    const { error } = await sa.from("ambassadors").update(patch).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "Team name already taken" : friendly(error.message));
    return { ok: true, pointsChanged: st?.status === "not_started" };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tournament_name: z.string().trim().min(2).max(60),
      base_price: z.number().int().min(1),
      min_increment: z.number().int().min(1),
      default_starting_points: z.number().int().min(0).max(10_000_000),
      retain_price: z.number().int().min(0),
      max_retains: z.number().int().min(0).max(10),
      max_players: z.number().int().min(1).max(1000),
      max_ambassadors: z.number().int().min(1).max(100),
      max_casters: z.number().int().min(1).max(20),
      apply_points_to_all: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { apply_points_to_all, ...rest } = data;
    const { data: st } = await sa.from("auction_state").select("status").eq("id", 1).single();
    const { error } = await sa.from("auction_state").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(friendly(error.message));
    if (apply_points_to_all) {
      if (st?.status !== "not_started") throw new Error("Settings saved, but team points can only be reset before the auction starts");
      await sa.from("ambassadors").update({ starting_points: data.default_starting_points, remaining_points: data.default_starting_points }).gte("starting_points", 0);
    }
    return { ok: true };
  });

/* ---------- Caster ---------- */

export const adminRemovePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: pl } = await sa.from("players").select("status").eq("id", data.playerId).maybeSingle();
    if (!pl) throw new Error("Player not found");
    if (!["pool", "unsold"].includes(pl.status)) throw new Error("Only pool or unsold players can be removed");
    const { error } = await sa.from("players").delete().eq("id", data.playerId);
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const adminRequeuePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: pl } = await sa.from("players").select("status").eq("id", data.playerId).maybeSingle();
    if (!pl || pl.status !== "unsold") throw new Error("Only unsold players can be requeued");
    // Clear the immutable unsold result so the next sale can record a new one.
    await sa.from("auction_results").delete().eq("player_id", data.playerId).eq("status", "unsold");
    const { error } = await sa
      .from("players")
      .update({ status: "pool", lot_number: null, updated_at: new Date().toISOString() })
      .eq("id", data.playerId);
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const setAuctionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    status: z.enum(["live", "paused", "stopped"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["caster", "admin"]);
    const sa = await admin();
    const { data: result, error } = await sa.rpc("caster_set_status", {
      p_status: data.status,
    });
    if (error) throw new Error(friendly(error.message));
    return result as { ok: boolean; status: string; started?: boolean; selection?: unknown };
  });

export const setCasterCam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ live: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["caster", "admin"]);
    const sa = await admin();
    const patch: { updated_at: string; caster_cam_live: boolean } = { updated_at: new Date().toISOString(), caster_cam_live: data.live };
    const { error } = await sa.from("auction_state").update(patch).eq("id", 1);
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const systemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const t = Date.now();
    const { error } = await sa.from("auction_state").select("id").eq("id", 1).single();
    const { data: buckets } = await sa.storage.listBuckets();
    return {
      database: error ? "error" : "connected",
      latencyMs: Date.now() - t,
      buckets: (buckets ?? []).map((b) => ({ name: b.name, public: b.public })),
    };
  });
