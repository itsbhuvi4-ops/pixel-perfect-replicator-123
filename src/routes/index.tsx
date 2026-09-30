import { createFileRoute } from "@tanstack/react-router";
import { LiveAuction } from "@/components/LiveAuction";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Auction — BidX" },
      { name: "description", content: "Watch the esports player auction live: current player, highest bid and teams." },
      { property: "og:title", content: "Live Auction — BidX" },
      { property: "og:description", content: "Watch the esports player auction live with real-time bids." },
    ],
  }),
  component: () => <LiveAuction />,
});
