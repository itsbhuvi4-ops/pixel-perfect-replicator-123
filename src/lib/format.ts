
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("en-IN").format(value)} pts`;
}

export function plainPoints(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export const ROLE_LABELS: Record<string, string> = {
  primary_rusher: "Primary Rusher",
  secondary_rusher: "Secondary Rusher",
  sniper: "Sniper",
  nader: "Nader",
  supporter: "Supporter",
};

export const GAME_ROLES = [
  "primary_rusher",
  "secondary_rusher",
  "sniper",
  "nader",
  "supporter",
] as const;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "-")}@auction.local`;
}

export function statusLabel(s?: string | null): string {
  return ({ not_started: "IDLE", live: "LIVE", paused: "PAUSED", stopped: "STOPPED", completed: "COMPLETED" } as Record<string, string>)[s ?? ""] ?? "IDLE";
}

export function pts(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("en-IN").format(value)} pts`;
}
