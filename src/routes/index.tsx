import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ArenaScene = lazy(() => import("@/components/ArenaScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIDXAUCTION — The Ultimate Live Player Auction Experience" },
      { name: "description", content: "A cinematic 3D live player auction arena for esports teams, players and audiences." },
      { property: "og:title", content: "BIDXAUCTION — Live Player Auction" },
      { property: "og:description", content: "Enter the arena. Watch every bid happen live." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="bidx-world relative overflow-x-clip bg-[#030208] text-white">
      <section className="bidx-hero relative min-h-[100svh] overflow-hidden">
        <div className="bidx-scene pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <ClientOnly fallback={null}>
            <Suspense fallback={null}><ArenaScene /></Suspense>
          </ClientOnly>
        </div>
        <div className="bidx-vignette absolute inset-0" aria-hidden="true" />
        <div className="bidx-grid absolute inset-0" aria-hidden="true" />

        <header className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link to="/" className="font-display text-xl tracking-[0.08em] sm:text-2xl">
            BIDX<span className="text-violet-400">AUCTION</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.22em] text-white/65 md:flex">
            <a href="#arena" className="transition hover:text-white">Arena</a>
            <a href="#players" className="transition hover:text-white">Players</a>
            <a href="#teams" className="transition hover:text-white">Teams</a>
            <Link to="/auction" className="transition hover:text-white">Live Auction</Link>
          </nav>
          <Link to="/auction" className="rounded-full border border-violet-300/35 bg-black/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md transition hover:border-violet-300/70 hover:bg-violet-500/15">
            Enter Arena
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] max-w-[1500px] items-center px-5 pb-20 sm:px-8 lg:px-14">
          <div className="max-w-4xl">
            <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-violet-200/75">
              <span className="h-px w-12 bg-violet-400" /> Live Player Auction Experience
            </div>
            <h1 className="bidx-title font-display uppercase leading-[0.72] tracking-[-0.035em]">
              BIDX<span>AUCTION</span>
            </h1>
            <p className="mt-8 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
              Enter a live esports auction where players become the prize, teams become rivals, and every bid changes the arena.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auction" className="bidx-primary-action">Watch Live Auction <span>↗</span></Link>
              <Link to="/player/register" className="bidx-secondary-action">Register Player</Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-12 right-6 hidden w-64 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl lg:block">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/45">
              <span>Next auction</span><span className="text-violet-300">LIVE SYSTEM</span>
            </div>
            <div className="mt-4 text-3xl font-mono tracking-widest">00:18:32</div>
            <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/35">Prepare for the next player reveal</div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-center">
          <div className="mb-2 text-[9px] uppercase tracking-[0.3em] text-white/40">Scroll to enter</div>
          <div className="mx-auto h-9 w-px overflow-hidden bg-white/20"><div className="bidx-scroll-line h-1/2 w-full bg-violet-400" /></div>
        </div>
      </section>

      <section id="arena" className="bidx-panel relative min-h-[95svh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,.2),transparent_40%)]" />
        <div className="relative mx-auto flex min-h-[95svh] max-w-6xl items-center px-5 py-24 sm:px-8">
          <div>
            <p className="bidx-kicker">01 / ENTER THE ARENA</p>
            <h2 className="bidx-section-title">WHERE<br /><span>EVERY BID</span><br />MATTERS.</h2>
            <p className="mt-8 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
              A cinematic auction environment built for the audience first. Follow the player reveal, watch the bidding war, and see the winner claim their roster spot in real time.
            </p>
          </div>
          <div className="absolute right-[5%] top-1/2 hidden -translate-y-1/2 rotate-6 md:block">
            <div className="bidx-orbital-card">
              <div className="text-[9px] uppercase tracking-[0.22em] text-violet-300">LIVE LOT 07</div>
              <div className="mt-12 text-7xl font-display">ZERO</div>
              <div className="mt-2 text-xs uppercase tracking-[0.18em] text-white/45">Assaulter / Rusher</div>
              <div className="mt-12 border-t border-white/10 pt-4">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">Current bid</div>
                <div className="mt-1 text-4xl font-mono text-violet-200">12,500</div>
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

      <section className="relative overflow-hidden border-t border-white/10 bg-black py-28">
        <div className="bidx-marquee" aria-hidden="true">BIDXAUCTION · ENTER THE ARENA · LIVE PLAYER AUCTION · BIDXAUCTION · ENTER THE ARENA ·</div>
        <div className="mx-auto max-w-4xl px-5 pt-20 text-center">
          <p className="bidx-kicker">THE AUCTION IS LIVE</p>
          <h2 className="mt-7 font-display text-6xl uppercase leading-none tracking-tight sm:text-8xl">READY TO<br /><span className="text-violet-300">BID?</span></h2>
          <Link to="/auction" className="bidx-primary-action mt-10">Enter Live Auction <span>↗</span></Link>
        </div>
      </section>
    </main>
  );
}
