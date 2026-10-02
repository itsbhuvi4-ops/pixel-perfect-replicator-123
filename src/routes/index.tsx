import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BidX Auction — Live Player Auction" },
      {
        name: "description",
        content: "BidXAuction — the live player auction arena for teams, players and fans.",
      },
      { property: "og:title", content: "BidX Auction" },
      { property: "og:description", content: "The Ultimate Live Player Auction Experience" },
    ],
  }),
  component: LandingPage,
});

function ArrowButton({ to, children }: { to: "/auction"; children: string }) {
  return (
    <Link
      to={to}
      className="group relative inline-flex min-h-14 items-center overflow-hidden rounded-full border border-gold bg-gold px-6 pr-16 font-cond text-sm font-semibold uppercase tracking-[0.14em] text-arena transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-arena"
    >
      <span className="relative z-10">{children}</span>
      <span
        className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-arena text-gold transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-arena">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_30%),linear-gradient(120deg,var(--arena)_0%,var(--arena)_52%,oklch(0.22_0.018_268)_100%)]" />
      <div
        className="absolute -right-40 top-24 size-[34rem] rounded-full border border-gold/10 bg-gold/[0.03] blur-sm"
        aria-hidden="true"
      />
      <div
        className="absolute -right-16 top-40 size-[25rem] rounded-full border border-gold/10"
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link to="/" className="font-display text-2xl tracking-wide text-foreground">
          BID<span className="text-gold">X</span>
        </Link>
        <nav className="flex items-center gap-5 font-cond text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/login" className="transition-colors hover:text-gold">
            Login
          </Link>
          <Link to="/player/register" className="transition-colors hover:text-gold">
            Sign up
          </Link>
          <Link
            to="/player/register"
            className="hidden rounded-full border border-line px-4 py-2 text-foreground transition-colors hover:border-gold hover:text-gold sm:inline-flex"
          >
            Join player pool
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl items-center px-6 pb-16 pt-8 sm:px-10 lg:px-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="label-cond mb-6 flex items-center gap-3 text-xs text-gold">
              <span className="size-2 rounded-full bg-gold live-dot" /> Live player auction platform
            </p>
            <h1 className="font-display text-[clamp(4.5rem,10vw,9rem)] leading-[0.82] tracking-[-0.03em] text-foreground">
              BidX<span className="text-gold">Auction</span>
            </h1>
            <p className="mt-8 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              A live bidding arena where teams discover talent, players earn their place, and every bid moves the game forward.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ArrowButton to="/auction">Enter auction</ArrowButton>
              <Link
                to="/player/register"
                className="inline-flex min-h-14 items-center rounded-full border border-line px-6 font-cond text-sm font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-gold hover:text-gold"
              >
                Register as a player
              </Link>
            </div>
            <div className="mt-16 flex gap-8 border-t border-line pt-5 font-cond uppercase tracking-[0.12em]">
              <div>
                <p className="font-display text-3xl text-foreground">4</p>
                <p className="text-[10px] text-muted-foreground">Roles, one arena</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">Live</p>
                <p className="text-[10px] text-muted-foreground">Real-time bidding</p>
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">24/7</p>
                <p className="text-[10px] text-muted-foreground">Built for competition</p>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[32rem] lg:block" aria-label="Auction preview">
            <div className="absolute inset-8 rounded-[2rem] border border-gold/20 bg-panel/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="label-cond text-xs text-gold">Live auction</span>
                <span className="flex items-center gap-2 font-mono text-[10px] text-alert">
                  <span className="size-1.5 rounded-full bg-alert live-dot" /> ON AIR
                </span>
              </div>
              <div className="mt-8 flex items-end justify-between">
                <div>
                  <p className="label-cond text-[10px] text-muted-foreground">Current player</p>
                  <p className="mt-2 font-display text-5xl text-foreground">NOVA</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    UID 7842 · PRIMARY RUSHER
                  </p>
                </div>
                <span className="rounded-full bg-gold/10 px-3 py-1 font-cond text-xs uppercase text-gold">
                  01 / 12
                </span>
              </div>
              <div className="mt-10 border-y border-line py-6">
                <p className="label-cond text-[10px] text-muted-foreground">Current bid</p>
                <p className="bid-flash mt-1 font-display text-7xl text-gold">₹12,500</p>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full w-3/4 bg-gold" />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-cond text-xs uppercase tracking-widest text-muted-foreground">
                  Highest bidder
                </span>
                <span className="font-display text-lg text-foreground">TEAM ALPHA</span>
              </div>
            </div>
            <div className="absolute -bottom-1 right-0 rounded-full border border-gold/40 bg-arena px-5 py-3 font-cond text-xs uppercase tracking-[0.14em] text-gold">
              Your next pick is waiting →
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
