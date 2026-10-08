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
  const { error: roleError } = await sa.from("user_roles").insert({ user_id: id, role });
  if (roleError) {
    await sa.auth.admin.deleteUser(id);
    throw new Error(friendly(roleError.message));
  }
  return id;
}

async function rolesOf(ctx: { supabase: any; userId: string }): Promise<string[]> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

async function requireRole(ctx: { supabase: any; userId: string }, allowed: Role[]) {
  const roles = await rolesOf(ctx);
  if (!roles.some((r) => allowed.includes(r as Role))) throw new Error("Not allowed");
}

/* ---------- WebRTC ICE configuration ---------- */

export const getWebRtcIceServers = createServerFn({ method: "GET" })
  .handler(async () => {
    const urls = (process.env["TURN_URLS"] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
    const credentialUrl = process.env["TURN_CREDENTIAL_URL"]?.trim();

    if (credentialUrl) {
      const headers: Record<string, string> = { accept: "application/json" };
      const apiKey = process.env["TURN_CREDENTIAL_API_KEY"];
      if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
      const response = await fetch(credentialUrl, { headers, cache: "no-store" });
      if (!response.ok) throw new Error("TURN credential service unavailable");
      const body = (await response.json()) as { urls?: string | string[]; username?: string; credential?: string };
      const dynamicUrls = Array.isArray(body.urls) ? body.urls : body.urls ? [body.urls] : urls;
      if (!dynamicUrls.length || !body.username || !body.credential) {
        throw new Error("TURN credential service returned an invalid response");
      }
      return {
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
          { urls: dynamicUrls, username: body.username, credential: body.credential },
        ],
      };
    }

    const username = process.env["TURN_USERNAME"];
    const credential = process.env["TURN_CREDENTIAL"];
    return {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        ...(urls.length && username && credential ? [{ urls, username, credential }] : []),
      ],
    };
  });

/* ---------- First-admin setup ---------- */

export const getFirstAdminSetupStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const sa = await admin();
    const { count, error } = await sa.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
    if (error) throw new Error(friendly(error.message));
    return { available: (count ?? 0) === 0 };
  });

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    username,
    password,
    setupCode: z.string().trim().min(12).max(200),
  }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["BIDX_FIRST_ADMIN_SETUP_CODE"];
    if (!expected || data.setupCode !== expected) throw new Error("Invalid setup code");

    const sa = await admin();
    const { count, error: countError } = await sa.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
    if (countError) throw new Error(friendly(countError.message));
    if ((count ?? 0) > 0) throw new Error("First-admin setup is already closed");

    const claimToken = crypto.randomUUID();
    const { data: claimed, error: claimError } = await (sa as any).rpc("claim_first_admin_setup", { p_token: claimToken });
    if (claimError || !claimed) throw new Error("First-admin setup is already in progress or closed");

    try {
      const id = await createAccount(data.username, data.password, "admin");
      await (sa as any).rpc("release_first_admin_setup", { p_token: claimToken });
      return { ok: true, userId: id };
    } catch (error) {
      await (sa as any).rpc("release_first_admin_setup", { p_token: claimToken });
      throw error;
    }
  });

/* ---------- Caster camera lease ---------- */

export const claimCasterCamera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["caster", "admin"]);
    const { data, error } = await (context.supabase as any).rpc("caster_claim_camera");
    if (error) throw new Error(friendly(error.message));
    return data as { ok: boolean; session_id: string };
  });

export const heartbeatCasterCamera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["caster", "admin"]);
    const { data: result, error } = await (context.supabase as any).rpc("caster_heartbeat_camera", { p_session_id: data.sessionId });
    if (error) throw new Error(friendly(error.message));
    return result as { ok: boolean; lease_until: string };
  });

export const getCasterHostStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["caster", "admin"]);
    const { data, error } = await (context.supabase as any).rpc("caster_host_status");
    if (error) throw new Error(friendly(error.message));
    return data as {
      host_active: boolean;
      is_current_user_host: boolean;
      host_name: string | null;
      lease_until: string | null;
    };
  });

export const adminReleaseCasterHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context, ["admin"]);
    const { data, error } = await (context.supabase as any).rpc("admin_release_caster_host");
    if (error) throw new Error(friendly(error.message));
    return data as { ok: boolean };
  });

export const releaseCasterCamera = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["caster", "admin"]);
    const { data: result, error } = await (context.supabase as any).rpc("caster_release_camera", { p_session_id: data.sessionId });
    if (error) throw new Error(friendly(error.message));
    return result as { ok: boolean };
  });

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
    if (!roles.includes(data.role)) return { ok: false, error: "This account doesn't have that role." };
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(friendly(error.message));
    return { ok: true, error: null, mustChangePassword: Boolean(profile?.must_change_password) };
  });

export const completePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
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
      sa.from("profiles").select("id, username, display_name, created_at").order("created_at"),
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

    // Supabase Auth refuses to delete a user who still owns Storage objects.
    // Do not assume uploads live only in the current player buckets or under a
    // particular folder: older uploads can exist elsewhere. Discover every
    // object owned by this account, then remove the physical files through the
    // Storage API before deleting auth.users.
    async function removeAllOwnedStorageObjects(uid: string) {
      const { data: objects, error } = await (sa.from("storage.objects") as any)
        .select("bucket_id,name,owner_id,owner")
        .or(`owner_id.eq.${uid},owner.eq.${uid}`)
        .limit(10000);

      if (error) throw new Error(friendly(error.message));

      const byBucket = new Map<string, string[]>();
      for (const object of objects ?? []) {
        if (!object.bucket_id || !object.name) continue;
        const paths = byBucket.get(object.bucket_id) ?? [];
        paths.push(object.name);
        byBucket.set(object.bucket_id, paths);
      }

      for (const [bucket, paths] of byBucket) {
        for (let i = 0; i < paths.length; i += 1000) {
          const batch = paths.slice(i, i + 1000);
          const { error: removeError } = await sa.storage.from(bucket).remove(batch);
          if (removeError) throw new Error(friendly(removeError.message));
        }
      }
    }

    await removeAllOwnedStorageObjects(data.userId);

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

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    if (data.userId === context.userId) throw new Error("You can't reset your own password from the admin panel");

    const sa = await admin();
    const { data: profile, error: profileError } = await sa
      .from("profiles")
      .select("username")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError || !profile?.username) throw new Error("Account not found");

    const { data: linkData, error } = await sa.auth.admin.generateLink({
      type: "recovery",
      email: usernameToEmail(profile.username),
      options: {
        redirectTo: `${process.env["PUBLIC_SITE_URL"] ?? process.env["VITE_APP_URL"] ?? "https://auction-delta.lovable.app"}/change-password`,
      },
    });
    if (error || !linkData?.properties?.action_link) throw new Error(friendly(error?.message));

    await sa
      .from("profiles")
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq("id", data.userId);

    return { resetLink: linkData.properties.action_link };
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

export const cleanupPlayerUploadObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    objects: z.array(z.object({ bucket: z.enum(["player-photos", "player-videos"]), path: z.string().min(3).max(500) })).max(2),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["player"]);
    const sa = await admin();
    const allowed = data.objects.filter((o) => o.path.startsWith(`${context.userId}/`));
    await Promise.all(allowed.map(async (o) => {
      const { error } = await sa.storage.from(o.bucket).remove([o.path]);
      if (error) console.error("[accounts] upload cleanup failed", { bucket: o.bucket, path: o.path, message: error.message });
    }));
    return { ok: true };
  });

export const adminDeleteAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ambassadorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, ["admin"]);
    const sa = await admin();
    const { data: ambassador } = await sa.from("ambassadors").select("id,user_id").eq("id", data.ambassadorId).maybeSingle();
    if (!ambassador) throw new Error("Ambassador not found");
    if (ambassador.user_id === context.userId) throw new Error("You can't delete your own account");

    const { data: state } = await sa.from("auction_state").select("status,current_bidder_id,current_player_id").eq("id", 1).maybeSingle();
    if (state?.current_bidder_id === ambassador.id) {
      throw new Error("This ambassador is the active bidder; finish or clear the current lot first");
    }

    // The database BEFORE DELETE trigger snapshots the ambassador identity and
    // history rows use ON DELETE SET NULL. Verify immutable history counts.
    const [{ count: resultsBefore }, { count: bidsBefore }, { count: retainsBefore }] = await Promise.all([
      sa.from("auction_results").select("id", { count: "exact", head: true }),
      sa.from("bids").select("id", { count: "exact", head: true }),
      sa.from("retain_records").select("id", { count: "exact", head: true }),
    ]);

    const { error } = await sa.auth.admin.deleteUser(ambassador.user_id);
    if (error) {
      console.error("[accounts] ambassador deletion failed", { ambassadorId: ambassador.id, message: error.message, code: error.code });
      throw new Error(
        /database error deleting user/i.test(error.message)
          ? "Database still has a reference to this ambassador. No history was deleted; apply the history-safe deletion migration and try again."
          : friendly(error.message),
      );
    }

    const [{ data: remainingProfile }, { data: remainingRole }, { data: remainingAmbassador },
      { count: resultsAfter }, { count: bidsAfter }, { count: retainsAfter }] = await Promise.all([
      sa.from("profiles").select("id").eq("id", ambassador.user_id).maybeSingle(),
      sa.from("user_roles").select("user_id").eq("user_id", ambassador.user_id).eq("role", "ambassador").maybeSingle(),
      sa.from("ambassadors").select("id").eq("id", ambassador.id).maybeSingle(),
      sa.from("auction_results").select("id", { count: "exact", head: true }),
      sa.from("bids").select("id", { count: "exact", head: true }),
      sa.from("retain_records").select("id", { count: "exact", head: true }),
    ]);

    if (remainingProfile || remainingRole || remainingAmbassador) {
      throw new Error("Ambassador deletion did not fully complete. Please retry.");
    }
    if ((resultsAfter ?? 0) !== (resultsBefore ?? 0) ||
        (bidsAfter ?? 0) !== (bidsBefore ?? 0) ||
        (retainsAfter ?? 0) !== (retainsBefore ?? 0)) {
      throw new Error("Ambassador deletion changed immutable auction history. Deletion was not accepted.");
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
    // Remove every Storage object owned by the player, not only the two
    // current upload buckets. Supabase Auth blocks deletion while owned
    // Storage objects remain.
    const { data: ownedObjects, error: ownedObjectsError } = await (sa.from("storage.objects") as any)
      .select("bucket_id,name,owner_id,owner")
      .or(`owner_id.eq.${player.user_id},owner.eq.${player.user_id}`)
      .limit(10000);
    if (ownedObjectsError) throw new Error(friendly(ownedObjectsError.message));

    const byBucket = new Map<string, string[]>();
    for (const object of ownedObjects ?? []) {
      if (!object.bucket_id || !object.name) continue;
      const paths = byBucket.get(object.bucket_id) ?? [];
      paths.push(object.name);
      byBucket.set(object.bucket_id, paths);
    }

    for (const [bucket, paths] of byBucket) {
      for (let i = 0; i < paths.length; i += 1000) {
        const { error } = await sa.storage.from(bucket).remove(paths.slice(i, i + 1000));
        if (error) throw new Error(friendly(error.message));
      }
    }

    // The database BEFORE DELETE trigger snapshots player identity and history
    // rows use ON DELETE SET NULL. Verify immutable history counts.
    const [{ count: resultsBefore }, { count: bidsBefore }, { count: retainsBefore }] = await Promise.all([
      sa.from("auction_results").select("id", { count: "exact", head: true }),
      sa.from("bids").select("id", { count: "exact", head: true }),
      sa.from("retain_records").select("id", { count: "exact", head: true }),
    ]);

    const { error: authError } = await sa.auth.admin.deleteUser(player.user_id);
    if (authError) {
      console.error("[accounts] player deletion failed", { playerId: player.id, message: authError.message, code: authError.code });
      throw new Error(
        /database error deleting user/i.test(authError.message)
          ? "Database still has a reference to this player. No history was deleted; apply the history-safe deletion migration and try again."
          : friendly(authError.message),
      );
    }

    const [{ data: remainingProfile }, { data: remainingRole }, { data: remainingPlayer },
      { count: resultsAfter }, { count: bidsAfter }, { count: retainsAfter }] = await Promise.all([
      sa.from("profiles").select("id").eq("id", player.user_id).maybeSingle(),
      sa.from("user_roles").select("user_id").eq("user_id", player.user_id).eq("role", "player").maybeSingle(),
      sa.from("players").select("id").eq("id", player.id).maybeSingle(),
      sa.from("auction_results").select("id", { count: "exact", head: true }),
      sa.from("bids").select("id", { count: "exact", head: true }),
      sa.from("retain_records").select("id", { count: "exact", head: true }),
    ]);

    if (remainingProfile || remainingRole || remainingPlayer) {
      throw new Error("Player deletion did not fully complete. Please retry.");
    }
    if ((resultsAfter ?? 0) !== (resultsBefore ?? 0) ||
        (bidsAfter ?? 0) !== (bidsBefore ?? 0) ||
        (retainsAfter ?? 0) !== (retainsBefore ?? 0)) {
      throw new Error("Player deletion changed immutable auction history. Deletion was not accepted.");
    }

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
