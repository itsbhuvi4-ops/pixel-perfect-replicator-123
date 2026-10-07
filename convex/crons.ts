import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup stale caster leases", { seconds: 15 }, internal.maintenance.cleanupCasterLeases);
crons.interval("repair expired auction deadlines", { seconds: 10 }, internal.auction.finalizeExpired);

export default crons;
