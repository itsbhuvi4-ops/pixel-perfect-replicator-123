import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIDXAUCTION — The Ultimate Live Player Auction Experience" },
      { name: "description", content: "A cinematic 3D live player auction arena for esports teams, players and audiences." },
      { property: "og:title", content: "BIDXAUCTION — Live Player Auction" },
      { property: "og:description", content: "Enter the arena. Watch every bid happen live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="bidx-world min-h-screen overflow-x-clip bg-background text-foreground">
      <section className="bidx-hero min-h-[88svh]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <header className="bidx-topbar flex h-20 items-center justify-between gap-4">
            <Link to="/" aria-label="BIDXAUCTION home" className="bidx-wordmark shrink-0">
              <span className="bidx-wordmark-mark" aria-hidden="true">B</span>
              <span>BIDX<span className="bidx-wordmark-light">AUCTION</span></span>
            </Link>
            <nav aria-label="Explore BidX" className="hidden items-center gap-8 text-sm md:flex">
              <a href="#arena" className="bidx-nav-link">The auction</a>
              <a href="#players" className="bidx-nav-link">Players</a>
              <a href="#teams" className="bidx-nav-link">Teams</a>
            </nav>
            <Link to="/login" search={{}} className="bidx-sign-in shrink-0">
              Sign in <span aria-hidden="true">↗</span>
            </Link>
          </header>

          <div className="bidx-hero-content flex min-h-[calc(88svh-5rem)] flex-col items-center justify-center pb-16 pt-8 text-center">
            <p className="bidx-hero-eyebrow mb-6 inline-flex items-center gap-2 text-xs font-medium uppercase sm:mb-8">
              <span className="bidx-status-dot" aria-hidden="true" />
              Free Fire player auction
            </p>
            <h1 className="bidx-hero-title max-w-5xl font-display text-6xl font-normal leading-[0.98] sm:text-7xl lg:text-8xl">
              Build your<br />
              <span>winning roster.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:mt-8 sm:text-lg">
              Follow every player reveal, team bid, and final result in one live auction.
            </p>
            <div className="mt-8 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link to="/auction" className="bidx-primary-action w-full justify-center sm:w-auto">
                Enter live auction <span aria-hidden="true">↗</span>
              </Link>
              <Link to="/player/register" className="bidx-secondary-action w-full justify-center sm:w-auto">
                Register as a player
              </Link>
            </div>
            <div className="bidx-hero-caption mt-10 text-xs sm:mt-14">
              REAL PLAYERS <span aria-hidden="true">·</span> LIVE BIDS <span aria-hidden="true">·</span> ONE WINNING LINEUP
            </div>
          </div>
        </div>
      </section>

      <section id="arena" className="bidx-panel relative min-h-[82svh] overflow-hidden">
        <div className="relative mx-auto flex min-h-[82svh] max-w-6xl items-center px-5 py-24 sm:px-8">
          <div>
            <p className="bidx-kicker">01 / ENTER THE ARENA</p>
            <h2 className="bidx-section-title">WHERE<br /><span>EVERY BID</span><br />MATTERS.</h2>
            <p className="mt-8 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              A cinematic auction environment built for the audience first. Follow the player reveal, watch the bidding war, and see the winner claim their roster spot in real time.
            </p>
          </div>
          <div className="absolute right-[5%] top-1/2 hidden -translate-y-1/2 rotate-6 md:block">
            <div className="bidx-orbital-card">
              <div className="text-[9px] uppercase text-brand-accent">LIVE LOT 07</div>
              <div className="mt-12 text-7xl font-display">ZERO</div>
              <div className="mt-2 text-xs uppercase text-muted-foreground">Assaulter / Rusher</div>
              <div className="mt-12 border-t border-border pt-4">
                <div className="text-[9px] uppercase text-muted-foreground">Current bid</div>
                <div className="mt-1 text-4xl font-mono text-brand-accent">12,500</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="players" className="bidx-panel relative overflow-hidden py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="bidx-kicker">02 / PLAYER REVEAL</p>
          <div className="mt-8 flex flex-col justify-between gap-10 md:flex-row md:items-end">
            <h2 className="bidx-section-title max-w-4xl">THE PLAYER<br /><span>BECOMES THE MOMENT.</span></h2>
            <Link to="/auction" className="bidx-secondary-action w-fit">Watch Live ↗</Link>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            <div className="bidx-sequence-item"><span>01</span><strong>NEXT PLAYER</strong><small>The arena goes dark.</small></div>
            <div className="bidx-sequence-item"><span>02</span><strong>PLAYER REVEAL</strong><small>Identity enters the scene.</small></div>
            <div className="bidx-sequence-item"><span>03</span><strong>BIDDING OPEN</strong><small>Every team can strike.</small></div>
          </div>
        </div>
      </section>

      <section id="teams" className="bidx-panel relative min-h-[85svh] overflow-hidden py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="bidx-kicker">03 / THE BATTLE</p>
          <h2 className="bidx-section-title mt-8">TEAMS<br /><span>TAKE POSITION.</span></h2>
          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bidx-team-card"><span>TEAM 01</span><strong>RDX WARRIORS</strong><em>84K PTS</em></div>
            <div className="bidx-team-card"><span>TEAM 02</span><strong>NOVA ESPORTS</strong><em>71K PTS</em></div>
            <div className="bidx-team-card"><span>TEAM 03</span><strong>TITANS</strong><em>58K PTS</em></div>
            <div className="bidx-team-card"><span>TEAM 04</span><strong>PHANTOM</strong><em>45K PTS</em></div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border bg-panel py-28">
        <div className="bidx-marquee" aria-hidden="true">BIDXAUCTION · ENTER THE ARENA · LIVE PLAYER AUCTION · BIDXAUCTION · ENTER THE ARENA ·</div>
        <div className="mx-auto max-w-4xl px-5 pt-20 text-center">
          <p className="bidx-kicker">THE AUCTION IS LIVE</p>
          <h2 className="mt-7 font-display text-6xl uppercase leading-none sm:text-8xl">READY TO<br /><span className="text-brand-accent">BID?</span></h2>
          <Link to="/auction" className="bidx-primary-action mt-10">Enter Live Auction <span>↗</span></Link>
        </div>
      </section>
    </main>
  );
}
