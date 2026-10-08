import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { useMyPlayer, useAuctionState, useRealtimeAuction, type Player } from "@/lib/auction";
import { GAME_ROLES, ROLE_LABELS, money } from "@/lib/format";
import { playerStoragePath, uploadPlayerFile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { cleanupPlayerUploadObjects, markPlayerUploadPromptSeen } from "@/lib/accounts.functions";

export const Route = createFileRoute("/my-player")({
  head: () => ({ meta: [{ title: "Player — Bid X Auction" }, { name: "robots", content: "noindex" },
      { name: "description", content: "View your BIDXAUCTION player profile and auction result." },
      { property: "og:title", content: "My Player — BIDXAUCTION" },
      { property: "og:description", content: "View your BIDXAUCTION player profile and auction result." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: () => (
    <RoleGate role="player">
      <PlayerPage />
    </RoleGate>
  ),
});

function PlayerPage() {
  const { user, username } = useAuth();
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: player, isLoading } = useMyPlayer(user?.id);
  const qc = useQueryClient();
  const [editCount, setEditCount] = useState(0);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);

  useEffect(() => {
    if (!player || !user) return;
    const count = Number((player as any).information_change_count ?? 0);
    setEditCount(count);
    if (count >= 3 || (player.photo_url && player.video_url)) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from("profiles") as any).select("player_upload_prompt_seen").eq("id", user.id).maybeSingle();
      if (!cancelled && !data?.player_upload_prompt_seen) setShowUploadPrompt(true);
    })();
    return () => { cancelled = true; };
  }, [player?.id, player?.photo_url, player?.video_url, user?.id]);

  if (isLoading) return <Center>Loading…</Center>;
  if (!player || !user) {
    return (
      <Center>
        <div>
          <h1 className="font-display text-4xl">Player profile not found</h1>
          <Link to="/player/register" className="label-cond mt-5 inline-block bg-gold px-4 py-2 text-sm text-arena">
            Register
          </Link>
        </div>
      </Center>
    );
  }

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my_player"] }),
      qc.invalidateQueries({ queryKey: ["players"] }),
    ]);
  };

  return (
    <main className="role-canvas mx-auto max-w-5xl px-3 py-5 sm:px-5">
      <nav className="sticky top-14 z-30 mb-5 flex gap-1 overflow-x-auto rounded-xl bg-panel p-2 ring-1 ring-line">
        <a href="#profile" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Profile</a>
        <a href="#auction" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Auction</a>
        <a href="#information" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Information</a>
      </nav>

      <section id="profile" className="scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
        <p className="selection-label w-fit bg-green px-3 py-1 text-xs">PLAYER WORKSPACE</p>
        <h1 className="mt-3 font-display text-5xl">Profile</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-panel2 p-3">
            <div className="label-cond text-[10px] text-mut">Username</div>
            <div className="mt-1 text-sm">{username ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3">
            <div className="label-cond text-[10px] text-mut">Password</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm">••••••••</span>
              <Link to="/change-password" className="label-cond border border-line px-3 py-1 text-[11px] text-mut hover:text-foreground">Change Password</Link>
            </div>
          </div>
        </div>
        <UsernameForm current={username ?? ""} />
      </section>

      <InformationSection player={player} editCount={editCount} setEditCount={setEditCount} onSaved={refresh} />

      <UploadsSection player={player} userId={user.id} onSaved={refresh} onPromptComplete={() => setShowUploadPrompt(false)} />

      {showUploadPrompt && (
        <UploadPrompt
          onLater={async () => {
            try { await markPlayerUploadPromptSeen(); } catch { /* allow a safe retry later */ }
            setShowUploadPrompt(false);
          }}
          onUpload={async () => {
            try { await markPlayerUploadPromptSeen(); } catch { /* upload section remains available */ }
            setShowUploadPrompt(false);
            document.getElementById("uploads")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <section id="auction" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
        <h2 className="font-display text-4xl">Auction</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.ingame_name} className="aspect-square w-full rounded-lg object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center rounded-lg bg-panel2 label-cond text-[11px] text-mut">Photo required</div>
          )}
          <div>
            <div className="font-display text-3xl">{player.ingame_name}</div>
            <div className="mt-2 text-sm text-mut">{player.info || "No player information saved."}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Info label="Auction status" value={player.status.replace("_", " ")} />
              <Info label="Current bid" value={state?.current_bid ? money(state.current_bid) : "—"} />
              <Info label="Auction player" value={state?.current_player_id === player.id ? "Current" : "Waiting"} />
            </div>
            {player.video_url && <video src={player.video_url} controls className="mt-4 aspect-video w-full rounded-lg object-cover" />}
          </div>
        </div>
      </section>
    </main>
  );
}

function UsernameForm({ current }: { current: string }) {
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || value.trim() === current) return;
    setBusy(true);
    try {
      const { changeUsername } = await import("@/lib/accounts.functions");
      await changeUsername({ data: { username: value.trim() } });
      toast.success("Username updated");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <input className="field flex-1" value={value} onChange={(e) => setValue(e.target.value)} minLength={3} maxLength={30} pattern="[A-Za-z0-9_#.-]+" title="Use only letters, numbers, _, #, . and -" required />
      <button disabled={busy || value.trim() === current} className="label-cond bg-gold px-4 py-2 text-[12px] text-arena disabled:opacity-40">
        {busy ? "Saving…" : "Change Username"}
      </button>
    </form>
  );
}

function InformationSection({
  player,
  editCount,
  setEditCount,
  onSaved,
}: {
  player: Player;
  editCount: number;
  setEditCount: (n: number) => void;
  onSaved: () => Promise<void>;
}) {
  const [f, setF] = useState({
    player_name: player.player_name,
    ingame_name: player.ingame_name,
    game_id: player.game_id,
    uid: (player as any).uid ?? "",
    experience: (player as any).experience ?? "",
    team_name: (player as any).team_name ?? "",
    primary_role: player.primary_role,
    secondary_role: player.secondary_role ?? "",
    info: player.info ?? "",
  });
  const [busy, setBusy] = useState(false);
  const count = Number((player as any).information_change_count ?? editCount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count >= 3) {
      toast.error("You have reached the maximum limit of 3 profile updates. You can no longer modify your player information, photos, or videos.");
      return;
    }
    if (!window.confirm("Information Change Notice\n\nYou are changing your player profile. This will use 1 of your 3 available profile updates.")) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("player_update_profile", {
        p_player_name: f.player_name.trim(),
        p_ingame_name: f.ingame_name.trim(),
        p_game_id: f.game_id.trim(),
        p_uid: f.uid.trim(),
        p_experience: f.experience.trim(),
        p_team_name: f.team_name.trim(),
        p_primary_role: f.primary_role,
        p_secondary_role: f.secondary_role || null,
        p_info: f.info.trim() || null,
      });
      if (error) throw error;
      const next = Number(data?.information_change_count ?? count + 1);
      setEditCount(next);
      toast.success(next >= 3 ? "Profile saved. Editing is now locked." : "Profile information saved");
      await onSaved();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="information" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-4xl">Information</h2>
          <p className="mt-1 text-sm text-mut">Profile Updates: {count} / 3{count >= 3 ? " — Editing Locked" : ""}</p>
        </div>
        {count >= 3 && <span className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Editing locked</span>}
      </div>
      {count >= 3 && <p className="mt-3 rounded-lg bg-alert/10 p-3 text-xs text-alert">You have reached the maximum limit of 3 profile updates. You can no longer modify your player information, photos, or videos.</p>}

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Original name" value={f.player_name} onChange={(e) => setF({ ...f, player_name: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="Game name / IGN" value={f.ingame_name} onChange={(e) => setF({ ...f, ingame_name: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="Game ID" value={f.game_id} onChange={(e) => setF({ ...f, game_id: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="UID" value={f.uid} onChange={(e) => setF({ ...f, uid: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="Gaming experience" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="Previous / current esports team" value={f.team_name} onChange={(e) => setF({ ...f, team_name: e.target.value })} required disabled={count >= 3} />
        <select className="field" value={f.primary_role} onChange={(e) => setF({ ...f, primary_role: e.target.value as Player["primary_role"] })} disabled={count >= 3}>
          {GAME_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
        <select className="field" value={f.secondary_role} onChange={(e) => setF({ ...f, secondary_role: e.target.value })} disabled={count >= 3}>
          <option value="">No secondary role</option>
          {GAME_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
        <textarea className="field min-h-28 sm:col-span-2" placeholder="Player information" value={f.info} onChange={(e) => setF({ ...f, info: e.target.value })} disabled={count >= 3} />
        <button disabled={busy || count >= 3} className="label-cond w-fit bg-gold px-4 py-2 text-[12px] text-arena disabled:opacity-40">
          {busy ? "Saving…" : count >= 3 ? "Editing Locked" : "Save Profile"}
        </button>
      </form>
    </section>
  );
}

function UploadsSection({
  player,
  userId,
  onSaved,
  onPromptComplete,
}: {
  player: Player;
  userId: string;
  onSaved: () => Promise<void>;
  onPromptComplete: () => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const progressStartedAt = useRef<number | null>(null);
  const progressStage = useRef<"compressing" | "uploading" | null>(null);
  const count = Number((player as any).information_change_count ?? 0);
  const locked = count >= 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      toast.error("You have reached the maximum limit of 3 profile updates. You can no longer modify your player information, photos, or videos.");
      return;
    }
    if (!photo && !player.photo_url) {
      toast.error("Photo is required");
      return;
    }
    if (!video && !player.video_url) {
      toast.error("Video is required");
      return;
    }

    setBusy(true);
    const created: { bucket: "player-photos" | "player-videos"; path: string }[] = [];
    try {
      const formatEta = (seconds?: number) => {
        if (seconds == null || !Number.isFinite(seconds)) return "";
        if (seconds < 60) return " • ~" + Math.max(1, seconds) + "s left";
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return " • ~" + minutes + "m " + remainder + "s left";
      };

      const reportUploadProgress = ({ stage, kind, percent, etaSeconds }: {
        stage: "compressing" | "uploading";
        kind: "photo" | "video";
        percent?: number;
        etaSeconds?: number;
      }) => {
        if (progressStage.current !== stage || progressStartedAt.current == null) {
          progressStage.current = stage;
          progressStartedAt.current = performance.now();
        }

        let estimatedSeconds = etaSeconds;
        if (stage === "compressing" && percent && percent > 0 && percent < 100 && progressStartedAt.current) {
          const elapsed = Math.max(0.1, (performance.now() - progressStartedAt.current) / 1000);
          estimatedSeconds = Math.max(0, Math.round((elapsed * (100 - percent)) / percent));
        }

        const suffix = formatEta(estimatedSeconds);
        setProgress(
          stage === "compressing"
            ? "Compressing " + kind + "… " + (percent ?? 0) + "%" + suffix
            : "Uploading " + kind + "… " + (percent ?? 0) + "%" + suffix,
        );
      };
      const photoResult = photo ? await uploadPlayerFile("player-photos", userId, photo, reportUploadProgress) : null;
      if (photoResult) created.push({ bucket: "player-photos", path: photoResult.path });
      const photoUrl = photoResult?.url ?? player.photo_url;
      const videoResult = video ? await uploadPlayerFile("player-videos", userId, video, reportUploadProgress) : null;
      if (videoResult) created.push({ bucket: "player-videos", path: videoResult.path });
      const videoUrl = videoResult?.url ?? player.video_url;
      setProgress("Saving profile…");

      const { data, error } = await (supabase.rpc as any)("player_update_uploads", {
        p_photo_url: photoUrl,
        p_video_url: videoUrl,
      });
      if (error) throw error;

      const obsolete: { bucket: "player-photos" | "player-videos"; path: string }[] = [];
      if (photoResult && player.photo_url) {
        const oldPath = playerStoragePath("player-photos", player.photo_url);
        if (oldPath && oldPath !== photoResult.path) obsolete.push({ bucket: "player-photos", path: oldPath });
      }
      if (videoResult && player.video_url) {
        const oldPath = playerStoragePath("player-videos", player.video_url);
        if (oldPath && oldPath !== videoResult.path) obsolete.push({ bucket: "player-videos", path: oldPath });
      }
      if (obsolete.length) await cleanupPlayerUploadObjects({ data: { objects: obsolete } }).catch(() => undefined);

      const next = Number(data?.information_change_count ?? count + 1);
      toast.success(next >= 3 ? "Uploads saved. Editing is now locked." : "Uploads saved");
      onPromptComplete();
      setPhoto(null);
      setVideo(null);
      await onSaved();
    } catch (err) {
      if (created.length) await cleanupPlayerUploadObjects({ data: { objects: created } }).catch(() => undefined);
      toast.error(errText(err));
    } finally {
      setBusy(false);
      setProgress("");
      progressStartedAt.current = null;
      progressStage.current = null;
    }
  };

  return (
    <section id="uploads" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-4xl">Photos & Videos</h2>
          <p className="mt-1 text-sm text-mut">Profile Updates: {count} / 3{locked ? " — Editing Locked" : ""}</p>
        </div>
        {locked && <span className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Editing locked</span>}
      </div>

      <div className="mt-4">
        <div className="label-cond text-[11px] text-mut">Uploaded Photos & Videos</div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-panel2 p-3 ring-1 ring-line">
            <div className="label-cond text-[11px] text-mut">Photo</div>
            {player.photo_url ? <img src={player.photo_url} alt={player.ingame_name} className="mt-2 aspect-video w-full rounded-lg object-cover" /> : <div className="mt-2 grid aspect-video place-items-center rounded-lg bg-panel2 text-xs text-mut">No photo uploaded</div>}
            <div className="mt-2 text-xs text-mut">{player.photo_url ? "Uploaded" : "Required"}</div>
          </div>
          <div className="rounded-lg bg-panel2 p-3 ring-1 ring-line">
            <div className="label-cond text-[11px] text-mut">Video</div>
            {player.video_url ? <video src={player.video_url} controls className="mt-2 aspect-video w-full rounded-lg object-cover" /> : <div className="mt-2 grid aspect-video place-items-center rounded-lg bg-panel2 text-xs text-mut">No video uploaded</div>}
            <div className="mt-2 text-xs text-mut">{player.video_url ? "Uploaded" : "Required"}</div>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-mut">Upload / replace photo
          <input type="file" accept="image/*" className="mt-2 block w-full" disabled={locked || busy} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="text-xs text-mut">Upload / replace video
          <input type="file" accept="video/*" className="mt-2 block w-full" disabled={locked || busy} onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
        </label>
        {progress && <div className="font-mono text-[11px] text-mut sm:col-span-2">{progress}</div>}
        <button disabled={busy || locked || (!photo && !video)} className="label-cond w-fit bg-gold px-4 py-2 text-[12px] text-arena disabled:opacity-40 sm:col-span-2">
          {locked ? "Editing Locked" : busy ? "Saving…" : "Save Media Update"}
        </button>
        {!locked && <p className="text-[11px] text-mut sm:col-span-2">Each successful profile or media update uses 1 of your 3 updates.</p>}
      </form>
    </section>
  );
}

function UploadPrompt({ onLater, onUpload }: { onLater: () => Promise<void>; onUpload: () => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-panel p-6 ring-1 ring-gold/40 shadow-2xl">
        <p className="selection-label w-fit bg-gold px-3 py-1 text-xs text-arena">PROFILE SETUP</p>
        <h2 className="mt-4 font-display text-3xl">Complete your player profile</h2>
        <p className="mt-3 text-sm text-mut">Kindly upload your photos and videos to complete your player profile.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => void onUpload()} className="label-cond flex-1 bg-gold px-4 py-3 text-[12px] text-arena">Upload Now</button>
          <button onClick={() => void onLater()} className="label-cond border border-line px-4 py-3 text-[12px] text-mut">Later</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-panel2 p-3"><div className="label-cond text-[10px] text-mut">{label}</div><div className="mt-1 text-sm capitalize">{value}</div></div>;
}
