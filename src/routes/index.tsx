import { createFileRoute, Link } from "@tanstack/react-router";

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
    <main className="min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <section className="relative isolate flex min-h-[calc(100vh-3.5rem)] items-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--gold)/.14),transparent_32%),radial-gradient(circle_at_85%_75%,hsl(var(--gold)/.08),transparent_30%)]" />
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <p className="label-cond text-[12px] tracking-[0.24em] text-gold">LIVE ESPORTS AUCTION PLATFORM</p>
            <h1 className="mt-4 font-display text-[clamp(4rem,12vw,9rem)] leading-[0.82] tracking-tight">
              BidX
              <span className="text-gold">.</span>
              <br />
              Auction
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-mut sm:text-lg">
              The Ultimate Live Player Auction Experience. Watch players get revealed, follow every bid in real time,
              and experience the complete auction from anywhere.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auction"
                className="label-cond inline-flex min-h-12 items-center justify-center bg-gold px-7 text-[13px] font-semibold text-arena transition-transform hover:-translate-y-0.5"
              >
                AUCTION
              </Link>
              <Link
                to="/login"
                className="label-cond inline-flex min-h-12 items-center justify-center border border-line bg-panel/70 px-7 text-[13px] transition-colors hover:border-gold/50 hover:text-gold"
              >
                SIGN IN / LOG IN
              </Link>
            </div>
          </div>

          <div className="mt-14 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ["LIVE", "Real-time auction state"],
              ["REVEAL", "Automatic player selection"],
              ["WATCH", "Public view — no login"],
            ].map(([title, copy]) => (
              <div key={title} className="border border-line bg-panel/55 p-4 backdrop-blur">
                <div className="label-cond text-[11px] text-gold">{title}</div>
                <div className="mt-2 text-sm text-mut">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
