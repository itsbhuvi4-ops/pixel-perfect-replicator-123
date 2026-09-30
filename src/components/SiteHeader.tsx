import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAuctionState } from "@/lib/auction";

const NAV = [
  { to: "/", label: "Live" },
  { to: "/auction", label: "Watch" },
] as const;

export function SiteHeader() {
  const { session, roles, username, signOut } = useAuth();
  const { data: state } = useAuctionState();
  const location = useLocation();

  // The broadcast output must stay clean for OBS / YouTube capture.
  if (location.pathname.startsWith("/broadcast")) return null;

  const roleLinks: { to: string; label: string }[] = [];
  if (roles.includes("ambassador")) roleLinks.push({ to: "/ambassador", label: "Team Console" });
  if (roles.includes("caster")) roleLinks.push({ to: "/caster", label: "Caster" });
  if (roles.includes("admin")) roleLinks.push({ to: "/admin", label: "Admin" });
  if (roles.includes("player")) roleLinks.push({ to: "/my-player", label: "My Profile" });

  const live = state?.status === "live";

  return (
    <header className="flex h-14 items-center gap-4 border-b border-line px-4 sm:px-5">
      <Link to="/" className="font-display text-xl tracking-wide">
        BidX<span className="text-gold">.</span>AUCTIONS
      </Link>
      <nav className="label-cond hidden gap-5 text-[13px] text-mut md:flex">
        {[...NAV, ...roleLinks].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "text-foreground" }}
            className="transition-colors hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {live && (
          <span className="flex items-center gap-1.5 border border-alert/30 bg-alert/10 px-2 py-1 font-mono text-[11px] text-alert">
            <i className="live-dot size-1.5 rounded-full bg-alert" />
            ON AIR
          </span>
        )}
        {state?.status === "paused" && (
          <span className="border border-line bg-panel px-2 py-1 font-mono text-[11px] text-mut">
            PAUSED
          </span>
        )}
        {session ? (
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-mut sm:inline">{username}</span>
            <button
              onClick={() => void signOut()}
              className="label-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] text-mut transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="label-cond bg-gold px-3 py-1.5 text-[12px] text-arena transition-opacity hover:opacity-90"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
