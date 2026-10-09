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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="bidx-world relative overflow-x-clip bg-[#030208] text-white">
      <section className="bidx-hero relative min-h-[min(920px,100svh)] overflow-hidden bg-[#fffef0] text-[#191916]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(255,255,255,.9),transparent_58%)]" aria-hidden="true" />
        <div className="relative z-20 bg-[#07584e] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-[#fffef0] sm:text-xs">
          BIDXAUCTION — The live player auction experience is here. <span className="ml-1" aria-hidden="true">↗</span>
        </div>

        <header className="relative z-20 mx-auto mt-4 flex max-w-[1440px] items-center justify-between gap-3 px-4 sm:mt-5 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-full border border-[#1a1a16]/10 bg-white/65 px-4 py-2.5 text-lg font-semibold tracking-[-0.04em] sm:text-xl">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#171714] text-[10px] font-bold text-[#fffef0]">BX</span>
            BIDX<span className="-ml-2 text-[#087c6b]">AUCTION</span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-[#1a1a16]/10 bg-[#efeee0] p-1 text-sm md:flex">
            <a href="#arena" className="rounded-full px-4 py-2 transition hover:bg-white">The Arena</a>
            <a href="#players" className="rounded-full px-4 py-2 transition hover:bg-white">Players</a>
            <a href="#teams" className="rounded-full px-4 py-2 transition hover:bg-white">Teams</a>
          </nav>
          <Link to="/auction" className="rounded-xl border border-[#191916] bg-[#ead7ff] px-3 py-2.5 text-[11px] font-semibold transition hover:bg-[#ddc0ff] sm:px-5 sm:text-sm">
            Watch live <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[650px] max-w-[1200px] flex-col items-center justify-center px-5 pb-24 pt-20 text-center sm:min-h-[690px] sm:px-8 sm:pt-24">
          <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.28em] text-[#5b5b50] sm:text-xs">A NEW ERA OF ESPORTS AUCTIONS</p>
          <h1 className="max-w-5xl font-display text-[clamp(3.6rem,10vw,8.8rem)] leading-[.83] tracking-[-0.075em] text-[#191916]">
            Build your<br />
            <span className="italic font-normal">dream roster.</span>
          </h1>
          <p className="mt-8 max-w-lg text-sm leading-6 text-[#45453d] sm:text-base sm:leading-7">
            Every player has a moment. Every bid changes the game. Step into BIDXAUCTION and watch your next winning lineup come together live.
          </p>
          <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link to="/auction" className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#191916] bg-[#e8d4ff] px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#dcc0ff] sm:w-auto">
              Enter live auction <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/player/register" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#191916]/15 bg-white/65 px-6 py-3 text-sm font-medium transition hover:bg-white sm:w-auto">
              Register as a player
            </Link>
          </div>

          <div className="pointer-events-none absolute bottom-10 left-1/2 hidden -translate-x-1/2 items-center gap-3 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-[#6c6c5f]/70 sm:flex">
            <span className="h-px w-10 bg-[#6c6c5f]/40" />
            REAL PLAYERS · LIVE BIDS · BIG MOMENTS
            <span className="h-px w-10 bg-[#6c6c5f]/40" />
          </div>
          <div className="absolute bottom-6 right-4 hidden rotate-[-8deg] rounded-full border border-[#171714]/15 bg-white/50 px-4 py-2 text-xs text-[#6c6c5f] md:block">
            Your next pick is out there ✳
          </div>
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
