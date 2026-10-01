import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Play, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BidX Auction — Live Player Auction" },
      { name: "description", content: "BidX Auction — the ultimate live player auction experience." },
      { property: "og:title", content: "BidX Auction" },
      { property: "og:description", content: "The Ultimate Live Player Auction Experience" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#160507] text-[#ead8c1]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,#67191d_0%,#2c0b0f_28%,#160507_68%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(234,216,193,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(234,216,193,.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />

      <header className="relative z-20 flex items-center justify-between border-b border-[#ead8c1]/15 px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-[#ead8c1]/25 p-2 transition hover:bg-[#ead8c1]/10" aria-label="Open menu">
            <Menu className="size-4" />
          </button>
          <Link to="/" className="font-display text-lg tracking-wide">BIDX<span className="text-[#df393e]">.</span></Link>
        </div>
        <nav className="hidden items-center gap-8 text-[10px] uppercase tracking-[0.28em] text-[#ead8c1]/65 md:flex">
          <Link to="/" className="text-[#ead8c1]">Home</Link>
          <Link to="/" className="transition hover:text-[#ead8c1]">Live auction</Link>
          <Link to="/" className="transition hover:text-[#ead8c1]">About</Link>
        </nav>
        <Link to="/login" className="flex items-center gap-2 rounded-full bg-[#ead8c1] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#210609] transition hover:bg-white">
          Sign in <ArrowUpRight className="size-3" />
        </Link>
      </header>

      <section className="relative flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-16 text-center">
        <div className="absolute left-6 top-12 text-left text-[9px] uppercase leading-5 tracking-[0.25em] text-[#ead8c1]/50 md:left-10">
          Est. 2026<br />Live player auction<br />New Delhi / India
        </div>
        <div className="absolute right-6 top-12 hidden text-right text-[9px] uppercase leading-5 tracking-[0.25em] text-[#ead8c1]/50 md:right-10 md:block">
          <span className="text-[#df393e]">●</span> Live now<br />Season 04 / Vol. 01<br />Scroll to explore
        </div>

        <div className="relative z-10 max-w-5xl">
          <p className="mb-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.4em] text-[#df393e]"><Sparkles className="size-3" /> The ultimate draft room</p>
          <h1 className="font-display text-[clamp(5rem,17vw,15rem)] leading-[0.72] tracking-[-0.06em] text-[#ead8c1] drop-shadow-[0_0_35px_rgba(223,57,62,.2)]">BIDX</h1>
          <div className="relative mx-auto -mt-1 flex max-w-3xl items-center justify-center gap-4 md:-mt-4">
            <span className="h-px w-10 bg-[#df393e]/70 md:w-24" />
            <p className="font-cond text-xl uppercase tracking-[0.34em] text-[#df393e] md:text-3xl">Auction</p>
            <span className="h-px w-10 bg-[#df393e]/70 md:w-24" />
          </div>
          <p className="mx-auto mt-8 max-w-md text-sm leading-6 text-[#ead8c1]/65">Where the next generation of players meets the teams that see what&apos;s possible.</p>
          <Link to="/auction" className="group mt-8 inline-flex items-center gap-3 rounded-full border border-[#ead8c1]/30 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] transition hover:border-[#df393e] hover:bg-[#df393e] hover:text-white">
            Enter live auction <span className="rounded-full bg-[#df393e] p-1.5 transition group-hover:bg-white group-hover:text-[#df393e]"><Play className="size-3 fill-current" /></span>
          </Link>
        </div>

        <div className="pointer-events-none absolute bottom-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#df393e]/20 blur-3xl md:h-72 md:w-72" />
        <div className="pointer-events-none absolute bottom-8 left-1/2 h-40 w-40 -translate-x-1/2 rounded-[45%] border border-[#df393e]/40 shadow-[0_0_80px_20px_rgba(223,57,62,.14)] [transform:translateX(-50%)_rotate(22deg)] md:h-56 md:w-56" />
        <div className="absolute bottom-6 left-6 text-[9px] uppercase tracking-[0.3em] text-[#ead8c1]/45 md:left-10">01 / 06</div>
        <div className="absolute bottom-6 right-6 text-[9px] uppercase tracking-[0.3em] text-[#ead8c1]/45 md:right-10">Scroll down ↓</div>
      </section>
    </main>
  );
}
