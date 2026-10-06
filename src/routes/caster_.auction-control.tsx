import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/Guard";
import { CasterConsole } from "@/routes/caster";

export const Route = createFileRoute("/caster_/auction-control")({
  head: () => ({ meta: [{ title: "Auction Control — BIDXAUCTION" }, { name: "description", content: "Run BIDXAUCTION bidding, player reveals and auction results." }, { property: "og:title", content: "Auction Control — BIDXAUCTION" }, { property: "og:description", content: "Run BIDXAUCTION bidding, player reveals and auction results." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <RoleGate role={["caster", "admin"]}><CasterConsole /></RoleGate>,
});
