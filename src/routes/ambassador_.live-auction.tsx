import { createFileRoute } from "@tanstack/react-router";
import { AmbassadorConsole } from "@/routes/ambassador";

export const Route = createFileRoute("/ambassador_/live-auction")({
  head: () => ({ meta: [{ title: "Team Live Auction — BIDXAUCTION" }, { name: "description", content: "Follow live BIDXAUCTION bids and manage your team roster." }, { property: "og:title", content: "Team Live Auction — BIDXAUCTION" }, { property: "og:description", content: "Follow live BIDXAUCTION bids and manage your team roster." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AmbassadorConsole,
});
