import { createFileRoute } from "@tanstack/react-router";
import { LiveAuction } from "@/components/LiveAuction";

/** Audience view — watch the live auction without an account. */
export const Route = createFileRoute("/auction")({
  head: () => ({
    meta: [
      { title: "Watch Live — BidX Auction" },
      { name: "description", content: "Watch the BidX player auction live, no account needed. Bids update in real time." },
      { property: "og:title", content: "Watch Live — BidX Auction" },
      { property: "og:description", content: "Live esports player auction with real-time bidding." },
    ],
  }),
  component: () => <LiveAuction audience />,
});
