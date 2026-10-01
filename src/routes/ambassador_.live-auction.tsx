import { createFileRoute } from "@tanstack/react-router";
import { AmbassadorConsole } from "@/routes/ambassador";

export const Route = createFileRoute("/ambassador_/live-auction")({
  component: AmbassadorConsole,
});
