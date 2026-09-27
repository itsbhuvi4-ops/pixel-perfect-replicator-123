import type { Ambassador } from "@/lib/auction";
import { initials, money } from "@/lib/format";

export function TeamRail({
  ambassadors,
  leaderId,
}: {
  ambassadors: Ambassador[];
  leaderId?: string | null;
}) {
  return (
    <div className="rounded-xl bg-panel p-4 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <span className="label-cond text-[12px] text-mut">Team Rail</span>
        <span className="font-mono text-[11px] text-mut">{ambassadors.length} teams</span>
      </div>
      <div className="mt-3 flex flex-col gap-px">
        {ambassadors.length === 0 && (
          <p className="py-2 font-mono text-[11px] text-mut">No teams registered yet.</p>
        )}
        {ambassadors.map((amb) => {
          const leading = amb.id === leaderId;
          return (
            <div
              key={amb.id}
              className={
                leading
                  ? "flex items-center gap-3 rounded-xl bg-panel2 px-3 py-3 outline-1 -outline-offset-1 outline-gold/25"
                  : "flex items-center gap-3 px-3 py-2"
              }
            >
              <div
                className={
                  leading
                    ? "grid size-8 place-items-center rounded-xl bg-gold/15 font-display text-sm text-gold ring-1 ring-gold/40"
                    : "grid size-8 place-items-center rounded-xl bg-panel2 font-display text-sm ring-1 ring-line"
                }
              >
                {initials(amb.team_name)}
              </div>
              <div className="leading-tight">
                <div className="label-cond text-[13px]">{amb.team_name}</div>
                <div className="font-mono text-[11px] text-mut">{money(amb.remaining_points)}</div>
              </div>
              {leading && <span className="ml-auto font-mono text-[11px] text-gold">LEAD</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
