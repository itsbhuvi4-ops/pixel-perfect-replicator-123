import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RoleGate, Center, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { useAuctionState, useAmbassadors, usePlayers, useRealtimeAuction } from "@/lib/auction";
import { adminDeleteAccount, updateSettings } from "@/lib/accounts.functions";
import { money } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Bid X Auction" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <RoleGate role="admin">
      <AdminPage />
    </RoleGate>
  ),
});

function AdminPage() {
  useRealtimeAuction();
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <AdminAuction />
      <AdminProfile />
      <AdminDatabase />
      <AdminSettings />
    </main>
  );
}

function AdminAuction() {
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const current = players.find((p) => p.id === state?.current_player_id);

  return (
    <section id="auction" className="scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h1 className="font-display text-4xl">Auction</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Auction" value={state?.status?.replace("_", " ") ?? "—"} />
        <Stat label="Player" value={current?.ingame_name ?? "—"} />
        <Stat label="Current Bid" value={state?.current_bid ? money(state.current_bid) : "—"} />
        <Stat label="Ambassadors" value={String(ambassadors.length)} />
      </div>
    </section>
  );
}

function AdminProfile() {
  const { username } = useAuth();
  return (
    <section id="profile" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-display text-4xl">Profile</h2>
      <div className="mt-4 rounded-lg bg-panel2 p-3">
        <div className="label-cond text-[10px] text-mut">Username</div>
        <div className="mt-1 text-sm">{username ?? "—"}</div>
      </div>
    </section>
  );
}

function AdminDatabase() {
  const [tab, setTab] = useState<"player" | "ambassador" | "caster">("player");
  return (
    <section id="database" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl">Database</h2>
          <p className="mt-1 text-sm text-mut">Total Players: <TotalPlayers /></p>
        </div>
        <div className="flex gap-1 rounded-lg bg-panel2 p-1">
          {(["player", "ambassador", "caster"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-md px-3 py-2 font-cond text-[11px] uppercase ${tab === value ? "bg-gold text-arena" : "text-mut"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {tab === "player" && <PlayerTable />}
        {tab === "ambassador" && <AmbassadorTable />}
        {tab === "caster" && <CasterTable />}
      </div>
    </section>
  );
}

function TotalPlayers() {
  const { data: players = [] } = usePlayers();
  return <>{players.length}</>;
}

function PlayerTable() {
  const { data: players = [] } = usePlayers();
  const { data: users = [] } = useAdminUsers();
  const deleteAccount = useServerFn(adminDeleteAccount);
  const qc = useQueryClient();
  const remove = async (userId: string, name: string) => {
    if (!window.confirm(`Delete player ${name}?`)) return;
    try {
      await deleteAccount({ data: { userId } });
      toast.success("Player deleted");
      await qc.invalidateQueries({ queryKey: ["players"] });
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) { toast.error(errText(err)); }
  };
  return <DataTable headers={["Username", "Password", "Information", "Photo", "Video", "Delete"]}>
    {players.map((p) => {
      const u = users.find((x) => x.id === p.user_id);
      return <tr key={p.id} className="border-b border-line/50 text-[12px]">
        <td className="px-3 py-3">{u?.username ?? p.ingame_name}</td>
        <td className="px-3 py-3 text-mut">••••••••</td>
        <td className="max-w-64 px-3 py-3 text-mut">{p.info || "—"}</td>
        <td className="px-3 py-3">{p.photo_url ? "Uploaded" : "Missing"}</td>
        <td className="px-3 py-3">{p.video_url ? "Uploaded" : "Missing"}</td>
        <td className="px-3 py-3"><button onClick={() => void remove(p.user_id, p.ingame_name)} className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Delete</button></td>
      </tr>;
    })}
  </DataTable>;
}

function AmbassadorTable() {
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: users = [] } = useAdminUsers();
  const deleteAccount = useServerFn(adminDeleteAccount);
  const qc = useQueryClient();
  const remove = async (userId: string, name: string) => {
    if (!window.confirm(`Delete ambassador ${name}?`)) return;
    try {
      await deleteAccount({ data: { userId } });
      toast.success("Ambassador deleted");
      await qc.invalidateQueries({ queryKey: ["ambassadors"] });
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) { toast.error(errText(err)); }
  };
  return <DataTable headers={["Username", "Password", "Team Name", "Delete"]}>
    {ambassadors.map((a) => {
      const u = users.find((x) => x.id === a.user_id);
      return <tr key={a.id} className="border-b border-line/50 text-[12px]">
        <td className="px-3 py-3">{u?.username ?? a.ambassador_name}</td>
        <td className="px-3 py-3 text-mut">••••••••</td>
        <td className="px-3 py-3">{a.team_name}</td>
        <td className="px-3 py-3"><button onClick={() => void remove(a.user_id, a.team_name)} className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Delete</button></td>
      </tr>;
    })}
  </DataTable>;
}

function CasterTable() {
  const { data: casters = [] } = useQuery({
    queryKey: ["casters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("casters").select("id,user_id,caster_name").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: users = [] } = useAdminUsers();
  const deleteAccount = useServerFn(adminDeleteAccount);
  const qc = useQueryClient();
  const remove = async (userId: string, name: string) => {
    if (!window.confirm(`Delete caster ${name}?`)) return;
    try {
      await deleteAccount({ data: { userId } });
      toast.success("Caster deleted");
      await qc.invalidateQueries({ queryKey: ["casters"] });
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) { toast.error(errText(err)); }
  };
  return <DataTable headers={["Caster Username", "Password", "Delete"]}>
    {casters.map((c) => {
      const u = users.find((x) => x.id === c.user_id);
      return <tr key={c.id} className="border-b border-line/50 text-[12px]">
        <td className="px-3 py-3">{u?.username ?? c.caster_name}</td>
        <td className="px-3 py-3 text-mut">••••••••</td>
        <td className="px-3 py-3"><button onClick={() => void remove(c.user_id, c.caster_name)} className="label-cond border border-alert/40 px-3 py-1 text-[11px] text-alert">Delete</button></td>
      </tr>;
    })}
  </DataTable>;
}

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data: profiles, error: pe } = await supabase.from("profiles").select("id,username").order("created_at");
      if (pe) throw pe;
      return profiles ?? [];
    },
  });
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-panel2">
      <table className="min-w-[720px] w-full text-left">
        <thead><tr className="border-b border-line label-cond text-[10px] text-mut">{headers.map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function AdminSettings() {
  const { data: state } = useAuctionState();
  const update = useServerFn(updateSettings);
  const [f, setF] = useState({
    base_price: 1000,
    default_starting_points: 50000,
    retain_price: 0,
    max_players: 50,
    max_ambassadors: 24,
    max_casters: 2,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setF({
      base_price: state.base_price,
      default_starting_points: state.default_starting_points ?? 50000,
      retain_price: state.retain_price ?? 0,
      max_players: state.max_players,
      max_ambassadors: state.max_ambassadors,
      max_casters: state.max_casters,
    });
  }, [state]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update({ data: f });
      toast.success("Settings saved");
    } catch (err) { toast.error(errText(err)); }
    finally { setBusy(false); }
  };

  return (
    <section id="settings" className="mt-5 scroll-mt-24 rounded-xl bg-panel p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-display text-4xl">Settings</h2>
      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Bid Point" value={f.base_price} onChange={(v) => setF({ ...f, base_price: v })} />
        <NumberField label="Start Points" value={f.default_starting_points} onChange={(v) => setF({ ...f, default_starting_points: v })} />
        <NumberField label="Retain" value={f.retain_price} onChange={(v) => setF({ ...f, retain_price: v })} />
        <NumberField label="Max Players" value={f.max_players} onChange={(v) => setF({ ...f, max_players: v })} />
        <NumberField label="Max Ambassadors" value={f.max_ambassadors} onChange={(v) => setF({ ...f, max_ambassadors: v })} />
        <NumberField label="Max Casters" value={f.max_casters} onChange={(v) => setF({ ...f, max_casters: v })} />
        <button disabled={busy} className="label-cond w-fit bg-gold px-5 py-2.5 text-[12px] text-arena disabled:opacity-40 sm:col-span-2 lg:col-span-3">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="block text-xs text-mut">{label}<input className="field mt-2 w-full" type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-panel2 p-3"><div className="label-cond text-[10px] text-mut">{label}</div><div className="mt-1 font-display text-2xl capitalize">{value}</div></div>;
}
