import { ArrowUpRight, MoveDown } from "lucide-react";

export default function LycorisSpecimen() {
  return (
    <section className="relative isolate min-h-[calc(100vh-73px)] overflow-hidden bg-[#f1eee8] text-[#171717]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.95),transparent_42%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#171717]/10" />
      <div className="absolute left-6 top-7 font-mono text-[9px] uppercase tracking-[0.25em] text-[#171717]/45 md:left-10">
        Botanical study / 001
      </div>
      <div className="absolute right-6 top-7 text-right font-mono text-[9px] uppercase tracking-[0.25em] text-[#171717]/45 md:right-10">
        Lycoris radiata<br />
        Red spider lily
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-[1500px] items-center justify-center px-6 py-24 md:px-12">
        <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 [writing-mode:vertical-rl] font-mono text-[9px] uppercase tracking-[0.3em] text-[#171717]/45 md:left-10 md:block">
          A flower that blooms between seasons
        </div>
        <div className="absolute bottom-7 left-6 font-mono text-[9px] uppercase tracking-[0.25em] text-[#171717]/45 md:left-10">
          35° 41&apos; N / 139° 41&apos; E
        </div>
        <div className="absolute bottom-7 right-6 font-mono text-[9px] uppercase tracking-[0.25em] text-[#171717]/45 md:right-10">
          Scroll to discover
        </div>

        <div className="relative z-10 w-full max-w-6xl text-center">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.42em] text-[#171717]/55">A visual archive of singular forms</p>
          <h1 className="font-display text-[clamp(5.5rem,18vw,17rem)] leading-[0.72] tracking-[-0.08em] text-[#171717]">
            LYCORIS
          </h1>
          <div className="mt-7 flex items-center justify-center gap-4 md:mt-10 md:gap-7">
            <span className="h-px w-10 bg-[#171717]/30 md:w-28" />
            <p className="font-cond text-xl uppercase tracking-[0.45em] text-[#b3212c] md:text-4xl">Specimen</p>
            <span className="h-px w-10 bg-[#171717]/30 md:w-28" />
          </div>
          <p className="mx-auto mt-8 max-w-md text-sm leading-6 text-[#171717]/60">
            A quiet study in motion, shape, and the fleeting beauty of things that refuse to stay still.
          </p>
          <button className="group mt-8 inline-flex items-center gap-3 rounded-full border border-[#171717]/30 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.22em] transition hover:border-[#b3212c] hover:bg-[#b3212c] hover:text-white">
            Explore the archive
            <span className="rounded-full bg-[#b3212c] p-1.5 text-white transition group-hover:bg-white group-hover:text-[#b3212c]"><ArrowUpRight className="size-3" /></span>
          </button>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(72vw,530px)] w-[min(72vw,530px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b3212c]/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(55vw,390px)] w-[min(55vw,390px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#171717]/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b3212c]/10 blur-3xl md:h-72 md:w-72" />
        <MoveDown className="absolute bottom-6 left-1/2 size-4 -translate-x-1/2 text-[#b3212c]" />
      </div>
    </section>
  );
}
