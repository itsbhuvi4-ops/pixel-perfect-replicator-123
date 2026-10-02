import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { useMyPlayer, useAuctionState, useRealtimeAuction, type Player } from "@/lib/auction";
import { GAME_ROLES, ROLE_LABELS, money } from "@/lib/format";
import { uploadPlayerFile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/my-player")({
  head: () => ({ meta: [{ title: "Player — Bid X Auction" }, { name: "robots", content: "noindex" }] }),
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
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-5">
      <nav className="sticky top-14 z-30 mb-5 flex gap-1 overflow-x-auto rounded-xl bg-panel p-2 ring-1 ring-line">
        <a href="#profile" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Profile</a>
        <a href="#information" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Information</a>
        <a href="#uploads" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Uploads</a>
        <a href="#auction" className="shrink-0 rounded-lg px-3 py-2 font-cond text-[12px] uppercase text-mut hover:bg-panel2 hover:text-foreground">Auction</a>
      </nav>

      <section id="profile" className="scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
        <h1 className="font-display text-4xl">Profile</h1>
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

      <UploadsSection player={player} userId={user.id} onSaved={refresh} />

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
      <input className="field flex-1" value={value} onChange={(e) => setValue(e.target.value)} minLength={3} required />
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
    primary_role: player.primary_role,
    secondary_role: player.secondary_role ?? "",
    info: player.info ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(editCount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count >= 3) return;
    const confirmed = window.confirm(
      "Information Change Notice\n\nYou are changing your player information. This will use 1 of your 3 available information changes.",
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("player_update_information", {
        p_player_name: f.player_name.trim(),
        p_ingame_name: f.ingame_name.trim(),
        p_game_id: f.game_id.trim(),
        p_primary_role: f.primary_role,
        p_secondary_role: f.secondary_role || null,
        p_info: f.info.trim() || null,
      });
      if (error) throw error;
      const next = Number(data?.information_change_count ?? count + 1);
      setCount(next);
      setEditCount(next);
      toast.success("Information saved");
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
          <p className="mt-1 text-sm text-mut">Information changes used: {count} / 3</p>
        </div>
        {count >= 3 && <span className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Editing locked</span>}
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Player name" value={f.player_name} onChange={(e) => setF({ ...f, player_name: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="In-game name" value={f.ingame_name} onChange={(e) => setF({ ...f, ingame_name: e.target.value })} required disabled={count >= 3} />
        <input className="field" placeholder="UID" value={f.game_id} onChange={(e) => setF({ ...f, game_id: e.target.value })} required disabled={count >= 3} />
        <select className="field" value={f.primary_role} onChange={(e) => setF({ ...f, primary_role: e.target.value as Player["primary_role"] })} disabled={count >= 3}>
          {GAME_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
        <select className="field" value={f.secondary_role} onChange={(e) => setF({ ...f, secondary_role: e.target.value })} disabled={count >= 3}>
          <option value="">No secondary role</option>
          {GAME_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
        <textarea className="field min-h-28 sm:col-span-2" placeholder="Player information" value={f.info} onChange={(e) => setF({ ...f, info: e.target.value })} disabled={count >= 3} />
        <button disabled={busy || count >= 3} className="label-cond w-fit bg-gold px-4 py-2 text-[12px] text-arena disabled:opacity-40">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function UploadsSection({ player, userId, onSaved }: { player: Player; userId: string; onSaved: () => Promise<void> }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const complete = !!player.photo_url && !!player.video_url;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo && !player.photo_url) {
      toast.error("Photo is required");
      return;
    }
    if (!video && !player.video_url) {
      toast.error("Video is required");
      return;
    }
    setBusy(true);
    try {
      const photoUrl = photo ? await uploadPlayerFile("player-photos", userId, photo) : player.photo_url;
      const videoUrl = video ? await uploadPlayerFile("player-videos", userId, video) : player.video_url;
      const { error } = await (supabase.rpc as any)("player_update_uploads", {
        p_photo_url: photoUrl,
        p_video_url: videoUrl,
      });
      if (error) throw error;
      toast.success("Uploads saved");
      setPhoto(null);
      setVideo(null);
      await onSaved();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="uploads" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-display text-4xl">Uploads</h2>
      <p className="mt-1 text-sm text-mut">Player setup is complete only when both Photo and Video are uploaded.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-panel2 p-3">
          <div className="label-cond text-[11px] text-mut">Photo</div>
          {player.photo_url && <img src={player.photo_url} alt={player.ingame_name} className="mt-2 aspect-video w-full rounded-lg object-cover" />}
          <div className="mt-2 text-xs text-mut">{player.photo_url ? "Uploaded" : "Required"}</div>
        </div>
        <div className="rounded-lg bg-panel2 p-3">
          <div className="label-cond text-[11px] text-mut">Video</div>
          {player.video_url && <video src={player.video_url} controls className="mt-2 aspect-video w-full rounded-lg object-cover" />}
          <div className="mt-2 text-xs text-mut">{player.video_url ? "Uploaded" : "Required"}</div>
        </div>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-mut">Upload Photo<input type="file" accept="image/*" className="mt-2 block w-full" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        <label className="text-xs text-mut">Upload Video<input type="file" accept="video/*" disabled={!!player.video_url} className="mt-2 block w-full disabled:opacity-40" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /></label>
        <button disabled={busy || complete} className="label-cond w-fit bg-gold px-4 py-2 text-[12px] text-arena disabled:opacity-40 sm:col-span-2">
          {complete ? "Setup Complete" : busy ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-panel2 p-3"><div className="label-cond text-[10px] text-mut">{label}</div><div className="mt-1 text-sm capitalize">{value}</div></div>;
}
