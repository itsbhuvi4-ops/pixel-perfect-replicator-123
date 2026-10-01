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
    <main className="relative h-screen min-h-[560px] w-full overflow-hidden bg-black">
      {/* The uploaded reference artwork is the complete visual source of truth for this hero. */}
      <img
        src="/hero-bidxauction.jpg"
        alt="BidX Auction hero"
        className="absolute inset-0 h-full w-full object-cover object-center select-none"
        draggable={false}
      />

      {/* Invisible interaction zones preserve the artwork exactly while keeping the visible UI functional. */}
      <Link
        to="/"
        aria-label="Home"
        className="absolute left-[4%] top-[3.5%] h-[7%] w-[8%]"
      />
      <Link
        to="/"
        aria-label="Support"
        className="absolute left-[11%] top-[3.5%] h-[7%] w-[8%]"
      />
      <Link
        to="/"
        aria-label="About"
        className="absolute left-[18%] top-[3.5%] h-[7%] w-[8%]"
      />
      <Link
        to="/login"
        aria-label="Login or Sign up"
        className="absolute right-[2%] top-[2.5%] h-[7%] w-[13%] min-w-28"
      />
      <Link
        to="/auction"
        aria-label="Auction Live"
        className="absolute left-1/2 top-[56%] h-[10%] w-[17%] min-w-44 -translate-x-1/2"
      />
    </main>
  );
}
