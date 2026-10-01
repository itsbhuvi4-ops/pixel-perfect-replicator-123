import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuctionState } from "@/lib/auction";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/auction", label: "Auction" },
] as const;

export function SiteHeader() {
  const { session, roles, username, signOut } = useAuth();
  const { data: state } = useAuctionState();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname.startsWith("/broadcast")) return null;

  const roleLinks: { to: string; label: string }[] = [];
  if (roles.includes("ambassador")) roleLinks.push({ to: "/ambassador", label: "Team Console" });
  if (roles.includes("caster")) roleLinks.push({ to: "/caster", label: "Caster" });
  if (roles.includes("admin")) roleLinks.push({ to: "/admin", label: "Admin" });
  if (roles.includes("player")) roleLinks.push({ to: "/my-player", label: "My Profile" });

  const links = [...NAV, ...roleLinks];
  const live = state?.status === "live";

  return (
    <header className="relative z-50 border-b border-line bg-background/95 px-4 backdrop-blur sm:px-5">
      <div className="flex min-h-14 items-center gap-3">
        <Link to="/" onClick={() => setOpen(false)} className="shrink-0 font-display text-xl tracking-wide">
          BidX<span className="text-gold">.</span>AUCTION
        </Link>

        <nav className="label-cond hidden items-center gap-5 text-[13px] text-mut md:flex">
          {links.map((item) => (
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

        <div className="ml-auto flex items-center gap-2">
          {live && (
            <span className="hidden items-center gap-1.5 border border-alert/30 bg-alert/10 px-2 py-1 font-mono text-[11px] text-alert sm:flex">
              <i className="live-dot size-1.5 rounded-full bg-alert" /> ON AIR
            </span>
          )}
          {state?.status === "paused" && (
            <span className="hidden border border-line bg-panel px-2 py-1 font-mono text-[11px] text-mut sm:block">PAUSED</span>
          )}

          {session ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-mono text-[11px] text-mut">{username}</span>
              <button onClick={() => void signOut()} className="label-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] text-mut hover:text-foreground">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="label-cond hidden bg-gold px-3 py-1.5 text-[12px] text-arena sm:block">
              Login
            </Link>
          )}

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center border border-line bg-panel2 text-lg md:hidden"
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="label-cond px-3 py-3 text-[13px] text-mut hover:bg-panel hover:text-foreground"
                activeProps={{ className: "bg-panel text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 border-t border-line pt-2">
            {session ? (
              <button
                onClick={() => { setOpen(false); void signOut(); }}
                className="label-cond w-full px-3 py-3 text-left text-[13px] text-mut hover:text-foreground"
              >
                Sign out · {username}
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="label-cond block px-3 py-3 text-[13px] text-gold">
                Sign in / Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
