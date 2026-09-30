import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { useMyPlayer, useRealtimeAuction, useAuctionState, type Player } from "@/lib/auction";
import { changeUsername } from "@/lib/accounts.functions";
import { GAME_ROLES, ROLE_LABELS, pts } from "@/lib/format";
import { uploadPlayerFile } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/my-player")({
  head: () => ({
    meta: [
      { title: "My Player Profile — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role="player">
      <PlayerDashboard />
    </RoleGate>
  ),
});

function PlayerDashboard() {
  const { user } = useAuth();
  useRealtimeAuction();
  const { data: state } = useAuctionState();
  const { data: player, isLoading } = useMyPlayer(user?.id);

  if (isLoading) return <Center>Loading…</Center>;
  if (!player)
    return (
      <Center>
        <div>
          <h1 className="font-display text-4xl">You're not registered yet</h1>
          <p className="mt-3 max-w-sm text-mut">
            Submit your profile once — name, UID and game role — and you'll enter the auction pool.
          </p>
          <Link to="/player/register" className="label-cond mt-6 inline-block bg-gold px-4 py-2 text-[13px] text-arena">
            Register as player
          </Link>
        </div>
      </Center>
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">My Player Profile</h1>
        <StatusBadge player={player} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.ingame_name} className="aspect-square w-full rounded-lg object-cover" />
          ) : (
            <div className="grid aspect-square w-full place-items-center rounded-lg bg-panel2 label-cond text-[12px] text-mut">
              No photo
            </div>
          )}
          <div className="mt-3 font-display text-2xl">{player.ingame_name}</div>
          <div className="font-mono text-[11px] text-mut">UID {player.game_id}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="label-cond border border-gold/50 px-2 py-0.5 text-[11px] text-gold">
              {ROLE_LABELS[player.primary_role]}
            </span>
            {player.secondary_role && (
              <span className="label-cond border border-line px-2 py-0.5 text-[11px] text-mut">
                {ROLE_LABELS[player.secondary_role]}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {player.status === "in_auction" && state?.current_player_id === player.id && (
            <div className="result-stamp rounded-xl bg-alert/15 p-4 ring-1 ring-alert/40">
              <div className="label-cond text-[13px] text-alert">You're on the block right now</div>
              <p className="mt-1 text-sm text-mut">Watch live — your lot is being auctioned.</p>
              <Link to="/" className="label-cond mt-2 inline-block bg-alert px-3 py-1.5 text-[12px] text-white">
                Watch live
              </Link>
            </div>
          )}
          {player.status === "sold" && (
            <div className="result-stamp rounded-xl bg-sold/10 p-4 ring-1 ring-sold/40">
              <div className="label-cond text-[13px] text-sold">SOLD</div>
              <p className="mt-1 text-sm text-mut">
                Congratulations! You were sold for <span className="text-gold">{pts(player.sold_price)}</span>. Check
                your team's console for roster details.
              </p>
            </div>
          )}
          {player.status === "retained" && (
            <div className="rounded-xl bg-gold/10 p-4 ring-1 ring-gold/40">
              <div className="label-cond text-[13px] text-gold">RETAINED</div>
              <p className="mt-1 text-sm text-mut">
                A team retained you directly for {pts(player.sold_price)}.
              </p>
            </div>
          )}
          {player.status === "unsold" && (
            <div className="rounded-xl bg-panel2 p-4 ring-1 ring-line">
              <div className="label-cond text-[13px] text-mut">UNSOLD</div>
              <p className="mt-1 text-sm text-mut">
                You went unsold this round. The admin may requeue you for a later round — keep an eye on this page.
              </p>
            </div>
          )}
          {player.status === "pool" && (
            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[13px] text-gold">Waiting for the auction</div>
              <p className="mt-1 text-sm text-mut">
                Your profile is locked in the pool. You can still fine-tune it below until the auction starts.
              </p>
            </div>
          )}

          {player.status === "pool" ? (
            <EditProfile player={player} />
          ) : (
            <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
              <div className="label-cond text-[12px] text-mut">Info</div>
              <p className="mt-1 text-sm">{player.info || "—"}</p>
              {player.video_url && (
                <video src={player.video_url} controls className="mt-3 w-full rounded-lg" />
              )}
              <p className="mt-3 font-mono text-[11px] text-mut">
                Profile is locked once auctioned — results are immutable.
              </p>
            </div>
          )}

          <AccountCard />
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ player }: { player: NonNullable<ReturnType<typeof useMyPlayer>["data"]> }) {
  const map: Record<string, { label: string; cls: string }> = {
    pool: { label: "In Pool", cls: "border-line text-mut" },
    in_auction: { label: "On The Block", cls: "border-alert/50 text-alert" },
    sold: { label: "SOLD", cls: "border-sold/50 text-sold" },
    retained: { label: "RETAINED", cls: "border-gold/50 text-gold" },
    unsold: { label: "UNSOLD", cls: "border-line text-mut" },
  };
  const s = map[player.status] ?? { label: player.status, cls: "border-line text-mut" };
  return <span className={`label-cond border px-3 py-1 text-[12px] ${s.cls}`}>{s.label}</span>;
}

function EditProfile({ player }: { player: NonNullable<ReturnType<typeof useMyPlayer>["data"]> }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState({
    player_name: player.player_name,
    ingame_name: player.ingame_name,
    secondary_role: player.secondary_role ?? "",
    info: player.info ?? "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const patch: {
        player_name: string;
        ingame_name: string;
        secondary_role: Player["secondary_role"];
        info: string | null;
        photo_url?: string;
        video_url?: string;
      } = {
        player_name: f.player_name.trim(),
        ingame_name: f.ingame_name.trim(),
        secondary_role: (f.secondary_role || null) as Player["secondary_role"],
        info: f.info.trim() || null,
      };
      if (photo) patch.photo_url = await uploadPlayerFile("player-photos", user.id, photo);
      if (video && !player.video_url) patch.video_url = await uploadPlayerFile("player-videos", user.id, video);
      const { error } = await supabase.from("players").update(patch).eq("id", player.id);
      if (error) throw error;
      toast.success("Profile updated");
      setPhoto(null);
      setVideo(null);
      await qc.invalidateQueries({ queryKey: ["my_player"] });
      await qc.invalidateQueries({ queryKey: ["players"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Edit profile</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Player name" value={f.player_name} onChange={set("player_name")} required />
        <input className="field" placeholder="In-game name" value={f.ingame_name} onChange={set("ingame_name")} required />
        <select className="field" value={f.secondary_role} onChange={set("secondary_role")}>
          <option value="">No secondary role</option>
          {GAME_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <input className="field sm:col-span-2" placeholder="Short info / achievements (optional)" value={f.info} onChange={set("info")} />
        <label className="text-xs text-mut">
          Replace photo
          <input type="file" accept="image/*" className="mt-1 block w-full" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="text-xs text-mut">
          {player.video_url ? "Video uploaded (locked)" : "Upload intro video (locked after upload)"}
          <input
            type="file"
            accept="video/*"
            disabled={!!player.video_url}
            className="mt-1 block w-full disabled:opacity-50"
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <button disabled={busy} className="label-cond mt-4 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50">
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function AccountCard() {
  const { user, username } = useAuth();
  const change = useServerFn(changeUsername);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(username ?? ""), [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await change({ data: { username: name } });
      toast.success("Username updated");
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Account</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input className="field flex-1" placeholder="Change username" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
        <button disabled={busy || name === username} className="label-cond border border-line bg-panel2 px-4 py-2 text-[12px] text-mut hover:text-foreground disabled:opacity-50">
          {busy ? "Saving…" : "Update"}
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-mut">Signed in as {user ? username : "—"}</p>
    </form>
  );
}
