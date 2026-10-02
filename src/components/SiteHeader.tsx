import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuctionState } from "@/lib/auction";

type NavItem = { to: string; label: string };

const publicLinks: NavItem[] = [
  { to: "/auction", label: "Auction" },
  { to: "/auction#top-sales", label: "Top Sales" },
  { to: "/auction#unsold", label: "Unsold" },
  { to: "/auction#teams", label: "Teams" },
  { to: "/auction#points", label: "Points" },
  { to: "/auction#total-players", label: "Total Players" },
  { to: "/auction#about", label: "About" },
  { to: "/auction#support", label: "Support" },
];

export function SiteHeader() {
  const { session, roles, username, signOut } = useAuth();
  const { data: state } = useAuctionState();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname.startsWith("/broadcast")) return null;

  let links: NavItem[] = publicLinks;
  if (roles.includes("admin") && !location.pathname.startsWith("/auction")) {
    links = [
      { to: "/admin", label: "Auction" },
      { to: "/admin#profile", label: "Profile" },
      { to: "/admin#database", label: "Database" },
      { to: "/admin#settings", label: "Settings" },
    ];
  } else if (roles.includes("caster") && !location.pathname.startsWith("/auction")) {
    links = [{ to: "/caster", label: "Auction" }];
  } else if (roles.includes("ambassador") && !location.pathname.startsWith("/auction")) {
    links = [
      { to: "/ambassador#profile", label: "Profile" },
      { to: "/ambassador#auction", label: "Auction" },
      { to: "/ambassador#team", label: "Team Information" },
    ];
  } else if (roles.includes("player") && !location.pathname.startsWith("/auction")) {
    links = [
      { to: "/my-player#profile", label: "Profile" },
      { to: "/my-player#information", label: "Information" },
      { to: "/my-player#uploads", label: "Uploads" },
      { to: "/my-player#auction", label: "Auction" },
    ];
  }

  const live = state?.status === "live";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 px-3 backdrop-blur-xl sm:px-5">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center gap-3">
        <Link to="/" className="shrink-0 font-display text-lg tracking-wide sm:text-xl">
          BID<span className="text-gold">X</span>AUCTION
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-full px-3 py-2 font-cond text-[11px] uppercase tracking-[0.08em] text-mut transition-colors hover:bg-panel2 hover:text-foreground"
              activeProps={{ className: "rounded-full bg-panel2 px-3 py-2 font-cond text-[11px] uppercase tracking-[0.08em] text-foreground" }}
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
            <button
              onClick={() => void signOut()}
              className="hidden rounded-full border border-line bg-panel2 px-3 py-1.5 font-cond text-[11px] text-mut transition hover:text-foreground sm:inline-flex"
            >
              Sign out · {username}
            </button>
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
            {links.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-cond text-[13px] uppercase tracking-[0.08em] text-mut hover:bg-panel2 hover:text-foreground"
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
