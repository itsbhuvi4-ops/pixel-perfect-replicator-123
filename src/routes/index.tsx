import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu } from "lucide-react";
import LycorisSpecimen from "../components/ui/lycoris-specimen";

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

      <LycorisSpecimen />
    </main>
  );
}
