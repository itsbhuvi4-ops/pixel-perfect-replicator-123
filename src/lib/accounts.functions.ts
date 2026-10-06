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
  .regex(/^[a-zA-Z0-9_#.-]+$/, "Username can use only letters, numbers, _, #, . and -");
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
        game_name: z.string().trim().min(2).max(40),
        game_id: z.string().trim().min(3).max(60),
        uid: z.string().trim().min(3).max(60),
        experience: z.string().trim().min(1).max(1000),
        team_name: z.string().trim().min(1).max(120),
        primary_role: roleEnum,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sa = await admin();
    const [{ data: gameDupe }, { data: uidDupe }] = await Promise.all([
      sa.from("players").select("id").eq("game_id", data.game_id).maybeSingle(),
      (sa.from("players") as any).select("id").eq("uid", data.uid).maybeSingle(),
    ]);
    if (gameDupe || uidDupe) throw new Error("Already Registered");
    const id = await createAccount(data.username, data.password, "player");
    const { error } = await (sa.from("players") as any).insert({
      user_id: id,
      player_name: data.player_name,
      ingame_name: data.game_name,
      game_id: data.game_id,
      uid: data.uid,
      experience: data.experience,
      team_name: data.team_name,
      submitted_at: new Date().toISOString(),
      primary_role: data.primary_role,
    });
    if (error) {
      await sa.auth.admin.deleteUser(id);
      throw new Error(friendly(error.message));
    }
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

export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    if (data.userId === context.userId) throw new Error("You can't delete your own account");

    const sa = await admin();
    const [{ data: player }, { data: ambassador }, { data: caster }, { data: profile }, { data: state }] =
      await Promise.all([
        sa.from("players").select("id,status").eq("user_id", data.userId).maybeSingle(),
        sa.from("ambassadors").select("id").eq("user_id", data.userId).maybeSingle(),
        sa.from("casters").select("id").eq("user_id", data.userId).maybeSingle(),
        sa.from("profiles").select("id").eq("id", data.userId).maybeSingle(),
        sa.from("auction_state")
          .select("status,current_player_id,current_bidder_id")
          .eq("id", 1)
          .maybeSingle(),
      ]);

    if (!profile && !player && !ambassador && !caster) {
      throw new Error("Account not found");
    }

    const deletingCurrentPlayer = !!player?.id && state?.current_player_id === player.id;
    const deletingCurrentBidder = !!ambassador?.id && state?.current_bidder_id === ambassador.id;

    // Remove transient live-auction references first. History rows remain untouched.
    if (deletingCurrentPlayer || deletingCurrentBidder) {
      const { error } = await sa
        .from("auction_state")
        .update({
          current_player_id: deletingCurrentPlayer ? null : state?.current_player_id ?? null,
          current_bid: null,
          current_bidder_id: null,
          bidding_open: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw new Error(friendly(error.message));

      const { error: eventError } = await sa.from("auction_events").insert({
        event_type: "ADMIN_ACCOUNT_DELETED",
        message: deletingCurrentPlayer
          ? "Admin deleted the current player account; the active lot was cleared."
          : "Admin deleted the current bidder account; the active bid was cleared.",
      });
      if (eventError) throw new Error(friendly(eventError.message));
    }

    // Delete owned player media before auth.users deletion. Auth cascades then
    // removes profiles, roles, role records and the player/ambassador/caster row
    // through the verified ON DELETE CASCADE relationships.
    async function removeUserFolder(bucket: string, uid: string) {
      const { data: objects, error: listError } = await sa.storage.from(bucket).list(uid, { limit: 1000 });
      if (listError) throw new Error(friendly(listError.message));
      const names = (objects ?? []).map((o) => o.name).filter(Boolean).map((name) => `${uid}/${name}`);
      if (names.length) {
        const { error } = await sa.storage.from(bucket).remove(names);
        if (error) throw new Error(friendly(error.message));
      }
    }

    if (player?.id) {
      await removeUserFolder("player-photos", data.userId);
      await removeUserFolder("player-videos", data.userId);
    }

    // IMPORTANT: do not manually delete public role/profile rows before this call.
    // Doing so can leave a half-deleted account if Auth rejects the final delete.
    // auth.admin.deleteUser() is the single source of truth and the database FKs
    // cascade the related public records safely.
    const { error: authError } = await sa.auth.admin.deleteUser(data.userId);
    if (authError) {
      console.error("[accounts] Supabase auth user deletion failed", {
        userId: data.userId,
        message: authError.message,
        code: authError.code,
      });
      throw new Error(
        /database error deleting user/i.test(authError.message)
          ? "Database still has a reference to this account. No account records were manually removed; try again after the database fix."
          : friendly(authError.message),
      );
    }

    // Defensive verification: a successful Auth delete must leave no application
    // account rows behind. This prevents the old "can't delete again" half-state.
    const [{ data: remainingProfile }, { data: remainingPlayer }, { data: remainingAmbassador }, { data: remainingCaster }] =
      await Promise.all([
        sa.from("profiles").select("id").eq("id", data.userId).maybeSingle(),
        sa.from("players").select("id").eq("user_id", data.userId).maybeSingle(),
        sa.from("ambassadors").select("id").eq("user_id", data.userId).maybeSingle(),
        sa.from("casters").select("id").eq("user_id", data.userId).maybeSingle(),
      ]);
    if (remainingProfile || remainingPlayer || remainingAmbassador || remainingCaster) {
      throw new Error("Account deletion did not fully complete. Please retry.");
    }

    if (deletingCurrentPlayer && state?.status === "live") {
      const { error: nextError } = await (sa as any).rpc("admin_select_next_player_after_delete", {
        p_request_id: crypto.randomUUID(),
      });
      if (nextError) throw new Error(friendly(nextError.message));
    }

    return { ok: true };
  });

export const markPlayerUploadPromptSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["player"]);
    const sa = await admin();
    const { error } = await (context.supabase as any).rpc("mark_player_upload_prompt_seen");
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
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

export const resetAuction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    // The reset RPC uses an explicit request id so PostgREST has an unambiguous
    // named-parameter contract and does not rely on a stale zero-argument signature.
    const { data, error } = await (sa as any).rpc("admin_reset_auction", {
      p_request_id: crypto.randomUUID(),
    });
    if (error) throw new Error(friendly(error.message));
    return data as {
      ok: boolean;
      players_reset: number;
      bids_deleted: number;
      results_deleted: number;
      retains_deleted: number;
      events_deleted: number;
    };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tournament_name: z.string().trim().min(2).max(80),
      tournament_season: z.string().trim().min(1).max(40),
      tournament_logo_url: z.string().trim().url().max(1000).or(z.literal("")),
      auction_branding: z.string().trim().min(2).max(80),
      base_price: z.number().int().min(1),
      min_increment: z.number().int().min(1),
      default_starting_points: z.number().int().min(0).max(10_000_000),
      retain_price: z.number().int().min(0),
      max_players: z.number().int().min(1).max(1000),
      max_ambassadors: z.number().int().min(1).max(100),
      max_casters: z.number().int().min(1).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: st } = await sa.from("auction_state").select("status").eq("id", 1).single();
    const { error } = await (sa.from("auction_state") as any).update({
      tournament_name: data.tournament_name,
      tournament_season: data.tournament_season,
      tournament_logo_url: data.tournament_logo_url || null,
      auction_branding: data.auction_branding,
      base_price: data.base_price,
      min_increment: data.min_increment,
      default_starting_points: data.default_starting_points,
      retain_price: data.retain_price,
      max_players: data.max_players,
      max_ambassadors: data.max_ambassadors,
      max_casters: data.max_casters,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) throw new Error(friendly(error.message));
    if (st?.status === "not_started") {
      await sa.from("ambassadors").update({
        starting_points: data.default_starting_points,
        remaining_points: data.default_starting_points,
      }).gte("starting_points", 0);
    }
    return { ok: true };
  });

/* ---------- Caster ---------- */

export const adminDeletePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ playerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const [{ data: player }, { data: state }] = await Promise.all([
      sa.from("players").select("id,user_id,status").eq("id", data.playerId).maybeSingle(),
      sa.from("auction_state").select("current_player_id").eq("id", 1).maybeSingle(),
    ]);

    if (!player) throw new Error("Player not found");
    if (state?.current_player_id === player.id || player.status === "in_auction") {
      throw new Error("This player is currently on the auction block");
    }
    if (!["pool", "unsold", "sold"].includes(player.status)) {
      throw new Error("Only pool, unsold, or sold players can be deleted");
    }

    // Use the Auth delete as the single destructive operation. Public player,
    // profile, role and contact rows are ON DELETE CASCADE/SET NULL from auth.users,
    // while the database trigger snapshots the player's auction identity first.
    const { data: objects, error: listError } = await sa.storage.from("player-photos").list(player.user_id, { limit: 1000 });
    if (listError) throw new Error(friendly(listError.message));
    const photoNames = (objects ?? []).map((o) => o.name).filter(Boolean).map((name) => `${player.user_id}/${name}`);
    if (photoNames.length) {
      const { error } = await sa.storage.from("player-photos").remove(photoNames);
      if (error) throw new Error(friendly(error.message));
    }
    const { data: videos, error: videoListError } = await sa.storage.from("player-videos").list(player.user_id, { limit: 1000 });
    if (videoListError) throw new Error(friendly(videoListError.message));
    const videoNames = (videos ?? []).map((o) => o.name).filter(Boolean).map((name) => `${player.user_id}/${name}`);
    if (videoNames.length) {
      const { error } = await sa.storage.from("player-videos").remove(videoNames);
      if (error) throw new Error(friendly(error.message));
    }

    const { error: authError } = await sa.auth.admin.deleteUser(player.user_id);
    if (authError) throw new Error(friendly(authError.message));
    return { ok: true };
  });

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
    return result as { ok: boolean; status: string; started?: boolean; selection?: { completed?: boolean } | null };
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
