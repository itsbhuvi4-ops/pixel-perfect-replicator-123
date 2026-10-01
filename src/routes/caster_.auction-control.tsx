import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/Guard";
import { CasterConsole } from "@/routes/caster";

export const Route = createFileRoute("/caster_/auction-control")({
  component: () => <RoleGate role={["caster", "admin"]}><CasterConsole /></RoleGate>,
});
