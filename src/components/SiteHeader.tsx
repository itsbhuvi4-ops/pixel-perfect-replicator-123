import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuctionState } from "@/lib/auction";

type NavItem = { to: string; label: string };

export function SiteHeader() {
  const { session, roles, username, signOut } = useAuth();
  const { data: state } = useAuctionState();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname.startsWith("/broadcast")) return null;

  const links: NavItem[] = [];

  if (roles.includes("admin")) {
    links.push(
      { to: "/admin", label: "Dashboard" },
      { to: "/admin_/live-monitor", label: "Live Monitor" },
    );
  } else if (roles.includes("caster")) {
    links.push(
      { to: "/caster", label: "Profile" },
      { to: "/caster", label: "Check" },
      { to: "/caster_/auction-control", label: "Auction" },
    );
  } else if (roles.includes("ambassador")) {
    links.push(
      { to: "/ambassador", label: "Profile" },
      { to: "/ambassador", label: "Team" },
      { to: "/ambassador_/live-auction", label: "Auction" },
    );
  } else if (roles.includes("player")) {
    links.push(
      { to: "/my-player", label: "Profile" },
      { to: "/auction", label: "Auction" },
      { to: "/my-player#information", label: "Information" },
    );
  } else {
    links.push({ to: "/", label: "Home" }, { to: "/auction", label: "Auction" });
  }

  const live = state?.status === "live";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 px-3 backdrop-blur-xl sm:px-5">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-3">
        <Link to="/" className="shrink-0 font-display text-lg tracking-wide sm:text-xl">
          BID<span className="text-gold">X</span>AUCTION
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 md:flex">
          {links.map((item, index) => (
            <Link
              key={item.to + index}
              to={item.to}
              activeProps={{ className: "bg-panel2 text-foreground" }}
              className="rounded-full px-3 py-2 font-cond text-[12px] uppercase tracking-[0.1em] text-mut transition-colors hover:bg-panel2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {live && (
            <span className="hidden items-center gap-1.5 rounded-full border border-alert/30 bg-alert/10 px-2.5 py-1 font-mono text-[10px] text-alert sm:flex">
              <i className="live-dot size-1.5 rounded-full bg-alert" /> ON AIR
            </span>
          )}

          {session ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-32 truncate font-mono text-[10px] text-mut">{username}</span>
              <button
                onClick={() => void signOut()}
                className="rounded-full border border-line bg-panel2 px-3 py-1.5 font-cond text-[11px] text-mut transition hover:text-foreground"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border border-gold bg-gold px-4 py-2 font-cond text-[11px] uppercase tracking-[0.12em] text-arena sm:inline-flex"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-full border border-line bg-panel2 text-lg md:hidden"
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto max-w-7xl border-t border-line py-3 md:hidden">
          <nav className="grid gap-1">
            {links.map((item, index) => (
              <Link
                key={item.to + index}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-cond text-[13px] uppercase tracking-[0.08em] text-mut hover:bg-panel2 hover:text-foreground"
                activeProps={{ className: "bg-panel2 text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session && (
            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="mt-2 w-full border-t border-line px-4 py-3 text-left font-cond text-[12px] uppercase tracking-[0.08em] text-mut"
            >
              Sign out · {username}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
