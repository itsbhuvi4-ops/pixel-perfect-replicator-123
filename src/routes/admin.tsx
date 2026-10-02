import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RoleGate, errText } from "@/components/Guard";
import { useAuth } from "@/lib/auth";
import { useAuctionState, usePlayers, useAmbassadors, useRealtimeAuction } from "@/lib/auction";
import {
  adminRemovePlayer,
  adminRequeuePlayer,
  createStaff,
  listUsers,
  resetUserPassword,
  seedDefaultAccounts,
  setUserActive,
  systemStatus,
  updateAmbassador,
  updateSettings,
} from "@/lib/accounts.functions";
import { ROLE_LABELS, plainPoints, money, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BidX Auction" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RoleGate role="admin">
      <AdminDashboard />
    </RoleGate>
  ),
});

const TABS = ["overview", "accounts", "teams", "players", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  accounts: "Accounts",
  teams: "Teams",
  players: "Players",
  settings: "Auction Settings",
};

type AdminUser = {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  roles: string[];
};

function AdminDashboard() {
  useRealtimeAuction();
  const [tab, setTab] = useState<Tab>("overview");
  const { username } = useAuth();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Admin</h1>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-mut">{username}</span>
          <Link to="/broadcast" className="label-cond border border-gold/50 px-3 py-1 text-[12px] text-gold">
            Broadcast View ↗
          </Link>
        </div>
      </div>

      <nav className="label-cond mt-5 flex flex-wrap gap-1 border-b border-line pb-px text-[13px]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "-mb-px border border-line border-b-panel bg-panel px-3.5 py-2 text-foreground"
                : "px-3.5 py-2 text-mut transition-colors hover:text-foreground"
            }
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "overview" && <OverviewTab />}
        {tab === "accounts" && <AccountsTab />}
        {tab === "teams" && <TeamsTab />}
        {tab === "players" && <PlayersTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </main>
  );
}

/* ---------------- Overview / monitoring ---------------- */

function OverviewTab() {
  const status = useQuery({ queryKey: ["system_status"], queryFn: useServerFn(systemStatus), refetchInterval: 30000 });
  const { data: state } = useAuctionState();
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();

  const counts = {
    pool: players.filter((p) => p.status === "pool").length,
    in_auction: players.filter((p) => p.status === "in_auction").length,
    sold: players.filter((p) => p.status === "sold").length,
    retained: players.filter((p) => p.status === "retained").length,
    unsold: players.filter((p) => p.status === "unsold").length,
  };
  const pot = players.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Auction</div>
          <div className="font-display text-3xl">{statusLabel(state?.status)}</div>
          <div className="mt-1 font-mono text-[11px] text-mut">Lot {state?.lot_counter ?? 0}</div>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Players</div>
          <div className="font-display text-3xl">{players.length}</div>
          <div className="mt-1 font-mono text-[11px] text-mut">
            {counts.pool} pool · {counts.sold} sold · {counts.unsold} unsold
          </div>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
          <div className="label-cond text-[12px] text-mut">Teams</div>
          <div className="font-display text-3xl">{ambassadors.length}</div>
          <div className="mt-1 font-mono text-[11px] text-mut">
            {money(ambassadors.reduce((s, a) => s + a.remaining_points, 0))} unspent
          </div>
        </div>
        <div className="rounded-xl bg-panel p-4 ring-1 ring-gold/40">
          <div className="label-cond text-[12px] text-mut">Points Spent</div>
          <div className="font-display text-3xl text-gold">{plainPoints(pot)}</div>
          <div className="mt-1 font-mono text-[11px] text-mut">{counts.retained} retained</div>
        </div>
      </div>

      <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="flex items-center justify-between">
          <div className="label-cond text-[12px] text-mut">System Health</div>
          <button
            onClick={() => void status.refetch()}
            className="label-cond border border-line bg-panel2 px-3 py-1 text-[11px] text-mut hover:text-foreground"
          >
            Re-check
          </button>
        </div>
        {status.isLoading ? (
          <p className="mt-2 font-mono text-[12px] text-mut">Checking…</p>
        ) : status.isError ? (
          <p className="mt-2 font-mono text-[12px] text-alert">Health check failed — {errText(status.error)}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[12px]">
            <span className={status.data?.database === "connected" ? "text-sold" : "text-alert"}>
              ● DB {status.data?.database} ({status.data?.latencyMs ?? "?"} ms)
            </span>
            {(status.data?.buckets ?? []).map((b) => (
              <span key={b.name} className="text-mut">
                ● bucket {b.name} ({b.public ? "public" : "private"})
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="label-cond text-[12px] text-mut">Quick Links</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
          <Link to="/caster" className="label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold">Caster console</Link>
          <Link to="/broadcast" className="label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold">Broadcast output</Link>
          <Link to="/auction" className="label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold">Audience view</Link>
          <Link to="/player/register" className="label-cond border border-line bg-panel2 px-3 py-1.5 hover:text-gold">Player registration</Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Accounts ---------------- */

function useUsersQuery() {
  return useQuery({ queryKey: ["admin_users"], queryFn: useServerFn(listUsers) });
}

function AccountsTab() {
  const users = useUsersQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <CreateStaffCard />
        <SeedCard />
      </div>

      <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
        <div className="flex items-center justify-between">
          <div className="label-cond text-[12px] text-mut">All Accounts</div>
          <button onClick={() => void users.refetch()} className="label-cond border border-line bg-panel2 px-3 py-1 text-[11px] text-mut hover:text-foreground">
            Refresh
          </button>
        </div>
        {users.isLoading && <p className="mt-2 font-mono text-[12px] text-mut">Loading…</p>}
        {users.isError && <p className="mt-2 text-[13px] text-alert">{errText(users.error)}</p>}
        {users.data && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="label-cond border-b border-line text-[11px] text-mut">
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Roles</th>
                  <th className="py-2 pr-3">Joined</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const qc = useQueryClient();
  const setActive = useServerFn(setUserActive);
  const resetPw = useServerFn(resetUserPassword);
  const [busy, setBusy] = useState(false);
  const active = user.is_active;

  const toggle = async () => {
    setBusy(true);
    try {
      await setActive({ data: { userId: user.id, active: !active } });
      toast.success(active ? "Account deactivated" : "Account activated");
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm(`Reset the password for ${user.username}?`)) return;
    setBusy(true);
    try {
      const res = await resetPw({ data: { userId: user.id } });
      toast.success(`New password: ${res.password} — share it privately`, { duration: 15000 });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-line/50 font-mono text-[12px]">
      <td className="py-2 pr-3">{user.username}</td>
      <td className="py-2 pr-3">
        <span className="flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span key={r} className="label-cond border border-line px-1.5 py-0.5 text-[10px] text-gold">{r}</span>
          ))}
        </span>
      </td>
      <td className="py-2 pr-3 text-mut">{new Date(user.created_at).toLocaleDateString()}</td>
      <td className="py-2 pr-3">
        <span className={active ? "text-sold" : "text-alert"}>{active ? "active" : "banned"}</span>
      </td>
      <td className="py-2">
        <span className="flex gap-2">
          <button disabled={busy} onClick={() => void toggle()} className="label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground">
            {active ? "Deactivate" : "Activate"}
          </button>
          <button disabled={busy} onClick={() => void reset()} className="label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground">
            Reset pw
          </button>
        </span>
      </td>
    </tr>
  );
}

function CreateStaffCard() {
  const qc = useQueryClient();
  const create = useServerFn(createStaff);
  const [f, setF] = useState({ username: "", password: "", role: "ambassador", name: "", team_name: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          username: f.username,
          password: f.password,
          role: f.role as "ambassador" | "caster",
          name: f.name,
          team_name: f.role === "ambassador" ? f.team_name : undefined,
        },
      });
      toast.success(`${f.role === "ambassador" ? "Ambassador" : "Caster"} created`);
      setF({ username: "", password: "", role: f.role, name: "", team_name: "" });
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
      await qc.invalidateQueries({ queryKey: ["ambassadors"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Create ambassador / caster</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select className="field" value={f.role} onChange={set("role")}>
          <option value="ambassador">Ambassador</option>
          <option value="caster">Caster</option>
        </select>
        <input className="field" placeholder={f.role === "ambassador" ? "Ambassador name" : "Caster name"} value={f.name} onChange={set("name")} required />
        <input className="field" placeholder="Username" value={f.username} onChange={set("username")} required minLength={3} />
        <input className="field" type="password" placeholder="Password (8+)" value={f.password} onChange={set("password")} required minLength={8} />
        {f.role === "ambassador" && (
          <input className="field sm:col-span-2" placeholder="Team name (unique)" value={f.team_name} onChange={set("team_name")} required />
        )}
      </div>
      <button disabled={busy} className="label-cond mt-3 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50">
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function SeedCard() {
  const seed = useServerFn(seedDefaultAccounts);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ username: string; password: string }[]>([]);

  const run = async () => {
    if (!confirm("Create 24 ambassadors (Team 001–024) and 2 casters with random passwords?")) return;
    setBusy(true);
    try {
      const res = await seed();
      setCreds(res?.created ?? []);
      if (!res?.created?.length) toast.info("Nothing to create — all default accounts already exist");
      else toast.success(`${res.created.length} accounts created`);
      await qc.invalidateQueries({ queryKey: ["admin_users"] });
      await qc.invalidateQueries({ queryKey: ["ambassadors"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Seed default accounts</div>
      <p className="mt-1 text-[13px] text-mut">
        Creates <span className="text-gold">Ambassador#001…024</span> (Team 001…024) and{" "}
        <span className="text-gold">Caster#001/002</span> with random passwords. Existing usernames are skipped.
      </p>
      <button
        onClick={() => void run()}
        disabled={busy}
        className="label-cond mt-3 border border-gold/50 bg-gold/10 px-4 py-2 text-[13px] text-gold disabled:opacity-50"
      >
        {busy ? "Seeding…" : "Seed 24 ambassadors + 2 casters"}
      </button>
      {creds.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] text-mut">{creds.length} accounts created — save these passwords now:</p>
          <textarea
            readOnly
            value={creds.map((c) => `${c.username} — ${c.password}`).join("\n")}
            className="field mt-1 h-32 w-full font-mono text-[11px]"
          />
          <button
            onClick={() => {
              void navigator.clipboard.writeText(creds.map((c) => `${c.username} — ${c.password}`).join("\n"));
              toast.success("Copied");
            }}
            className="label-cond mt-1 border border-line px-3 py-1.5 text-[12px] text-mut hover:text-foreground"
          >
            Copy all
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Teams ---------------- */

function TeamsTab() {
  const { data: ambassadors = [] } = useAmbassadors();
  const { data: state } = useAuctionState();
  const editable = state?.status === "not_started";

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <div className="label-cond text-[12px] text-mut">Ambassador Teams</div>
        <span className="font-mono text-[11px] text-mut">
          {editable ? "Points editable before start" : "Points locked once the auction starts"}
        </span>
      </div>
      {ambassadors.length === 0 ? (
        <p className="mt-2 font-mono text-[12px] text-mut">No teams yet — create or seed them in Accounts.</p>
      ) : (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {ambassadors.map((a) => (
            <TeamRow key={a.id} id={a.id} team={a.team_name} name={a.ambassador_name} points={a.starting_points} editable={editable} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  id,
  team,
  name,
  points,
  editable,
}: {
  id: string;
  team: string;
  name: string;
  points: number;
  editable: boolean;
}) {
  const qc = useQueryClient();
  const update = useServerFn(updateAmbassador);
  const [f, setF] = useState({ team_name: team, starting_points: String(points) });
  const [busy, setBusy] = useState(false);
  const dirty = f.team_name !== team || Number(f.starting_points) !== points;

  const save = async () => {
    setBusy(true);
    try {
      const res = await update({
        data: { id, team_name: f.team_name, starting_points: Number(f.starting_points) || 0 },
      });
      toast.success(res.pointsChanged ? "Team updated (points reset)" : "Team name updated");
      await qc.invalidateQueries({ queryKey: ["ambassadors"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg bg-panel2 p-2.5">
      <div className="flex items-center gap-2">
        <span className="label-cond flex-1 truncate text-[12px] text-mut">{name}</span>
        <button
          disabled={busy || !dirty}
          onClick={() => void save()}
          className="label-cond border border-line px-2 py-0.5 text-[11px] text-mut hover:text-foreground disabled:opacity-30"
        >
          Save
        </button>
      </div>
      <div className="mt-1.5 flex gap-2">
        <input className="field flex-1 !py-1.5 text-[12px]" value={f.team_name} onChange={(e) => setF({ ...f, team_name: e.target.value })} />
        <input
          className="field w-28 !py-1.5 text-right font-mono text-[12px]"
          value={f.starting_points}
          onChange={(e) => setF({ ...f, starting_points: e.target.value })}
          disabled={!editable}
          inputMode="numeric"
        />
      </div>
    </div>
  );
}

/* ---------------- Players ---------------- */

function PlayersTab() {
  const { data: players = [] } = usePlayers();
  const { data: ambassadors = [] } = useAmbassadors();
  const [filter, setFilter] = useState("all");
  const teamName = (id: string | null) => ambassadors.find((a) => a.id === id)?.team_name ?? "—";
  const filtered = players.filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-cond text-[12px] text-mut">Players ({players.length})</div>
        <select className="field !w-auto !py-1 text-[12px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all", "pool", "in_auction", "sold", "retained", "unsold"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="label-cond border-b border-line text-[11px] text-mut">
              <th className="py-2 pr-3">Player</th>
              <th className="py-2 pr-3">UID</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Sold To Ambassador Team</th>
              <th className="py-2 pr-3">Sold Price</th>
              <th className="py-2">Delete Player</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-line/50 font-mono text-[12px]">
                <td className="py-2 pr-3">{p.ingame_name} <span className="text-mut">({p.player_name})</span></td>
                <td className="py-2 pr-3 text-mut">{p.game_id}</td>
                <td className="py-2 pr-3 text-mut">{ROLE_LABELS[p.primary_role]}</td>
                <td className="py-2 pr-3">
                  <span className={
                    p.status === "sold" ? "text-sold" : p.status === "in_auction" ? "text-alert" : p.status === "retained" ? "text-gold" : "text-mut"
                  }>{p.status}</span>
                </td>
                <td className="py-2 pr-3">
                  {p.ambassador_id ? (
                    <span className="text-gold">{teamName(p.ambassador_id)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-3">{p.status === "sold" && p.sold_price != null ? plainPoints(p.sold_price) : "—"}</td>
                <td className="py-2"><PlayerActions id={p.id} status={p.status} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-3 text-center font-mono text-[12px] text-mut">No players</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerActions({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  const remove = useServerFn(adminRemovePlayer);
  const requeue = useServerFn(adminRequeuePlayer);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: ["players"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  if (status === "pool" || status === "unsold")
    return (
      <div className="flex flex-wrap gap-2">
        {status === "unsold" && (
          <button
            disabled={busy}
            onClick={() => void run(() => requeue({ data: { playerId: id } }), "Requeued to pool")}
            className="label-cond border border-gold/50 px-2 py-0.5 text-[11px] text-gold disabled:opacity-30"
          >
            Requeue
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => {
            if (confirm("Delete this player permanently?")) void run(() => remove({ data: { playerId: id } }), "Player deleted");
          }}
          className="label-cond border border-alert/40 px-2 py-0.5 text-[11px] text-alert disabled:opacity-30"
        >
          Delete
        </button>
      </div>
    );
  return <span className="text-[11px] text-mut">locked</span>;
}

/* ---------------- Settings ---------------- */

const DEFAULT_SETTINGS = {
  tournament_name: "PRO LEAGUE",
  base_price: "1000",
  min_increment: "500",
  default_starting_points: "50000",
  retain_price: "5000",
  max_retains: "1",
  max_players: "50",
  max_ambassadors: "24",
  max_casters: "2",
  apply_points_to_all: true,
};

function SettingsTab() {
  const qc = useQueryClient();
  const { data: state } = useAuctionState();
  const save = useServerFn(updateSettings);
  const [f, setF] = useState(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Sync form once the current settings arrive (React adjusts state before paint).
  if (state && !loaded) {
    setLoaded(true);
    setF({
      tournament_name: state.tournament_name,
      base_price: String(state.base_price),
      min_increment: String(state.min_increment),
      default_starting_points: String(state.default_starting_points),
      retain_price: String(state.retain_price),
      max_retains: String(state.max_retains),
      max_players: String(state.max_players),
      max_ambassadors: String(state.max_ambassadors),
      max_casters: String(state.max_casters),
      apply_points_to_all: true,
    });
  }

  const num = (v: string) => Number(v.replace(/[^0-9]/g, "")) || 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          tournament_name: f.tournament_name,
          base_price: num(f.base_price),
          min_increment: num(f.min_increment),
          default_starting_points: num(f.default_starting_points),
          retain_price: num(f.retain_price),
          max_retains: num(f.max_retains),
          max_players: num(f.max_players),
          max_ambassadors: num(f.max_ambassadors),
          max_casters: num(f.max_casters),
          apply_points_to_all: f.apply_points_to_all,
        },
      });
      toast.success("Settings saved");
      await qc.invalidateQueries({ queryKey: ["auction_state"] });
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="label-cond text-[12px] text-mut">Auction Settings</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Tournament name" className="sm:col-span-3">
          <input className="field w-full" value={f.tournament_name} onChange={set("tournament_name")} required />
        </Field>
        <Field label="Base price"><input className="field w-full" inputMode="numeric" value={f.base_price} onChange={set("base_price")} /></Field>
        <Field label="Min increment"><input className="field w-full" inputMode="numeric" value={f.min_increment} onChange={set("min_increment")} /></Field>
        <Field label="Starting points"><input className="field w-full" inputMode="numeric" value={f.default_starting_points} onChange={set("default_starting_points")} /></Field>
        <Field label="Retain price"><input className="field w-full" inputMode="numeric" value={f.retain_price} onChange={set("retain_price")} /></Field>
        <Field label="Max retains per team"><input className="field w-full" inputMode="numeric" value={f.max_retains} onChange={set("max_retains")} /></Field>
        <Field label="Max players"><input className="field w-full" inputMode="numeric" value={f.max_players} onChange={set("max_players")} /></Field>
        <Field label="Max ambassadors"><input className="field w-full" inputMode="numeric" value={f.max_ambassadors} onChange={set("max_ambassadors")} /></Field>
        <Field label="Max casters"><input className="field w-full" inputMode="numeric" value={f.max_casters} onChange={set("max_casters")} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-mut">
        <input type="checkbox" checked={f.apply_points_to_all} onChange={set("apply_points_to_all")} />
        Also reset every team's points to the new starting value (only works before the auction starts)
      </label>
      <button disabled={busy} className="label-cond mt-4 bg-gold px-4 py-2 text-[13px] text-arena disabled:opacity-50">
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label-cond text-[11px] text-mut">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
