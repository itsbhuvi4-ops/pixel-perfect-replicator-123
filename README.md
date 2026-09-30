# BidX Auction — Pixel Perfect Match

Live esports player auction. Implement exactly the screenshot and nothing else.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pixel-perfect-replicator-123.lovable.app

## Roles

| Role | Where | What it does |
| --- | --- | --- |
| 👤 Player | `/player/register` → `/my-player` | Register once, submit profile, wait for the auction, follow their lot result |
| 🛡️ Admin | `/setup` (first run) → `/admin` | First-admin bootstrap, manage accounts, seed 24 ambassadors + 2 casters, teams, players, auction settings, health monitoring |
| 💰 Ambassador | `/ambassador` | Team console: points, live bidding (idempotent `place_bid_v3`), retain, roster |
| 🎙️ Caster | `/caster` | Auction controls (start/pause/resume/stop, next player, SOLD) and WebRTC camera + microphone |
| 👀 Audience | `/auction` | Watch the live auction without an account |
| 📺 Broadcast | `/broadcast` | Clean fullscreen output for OBS/YouTube (no header, leaderboard + ticker) |

Realtime: Supabase Realtime keeps bids, state, events and results in sync everywhere instantly.
SOLD: `finalize_player_v3` atomically deducts the winning team's points and assigns the roster entry; history is immutable.
WebRTC: the caster streams camera + mic peer-to-peer; signaling runs over a Supabase Realtime broadcast channel (`src/lib/caster-cam.ts`).
Security: role checks in the UI (`RoleGate`), in server functions, and via Postgres RLS + `SECURITY DEFINER` RPCs.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/188be25d-7156-4607-be9d-45d39ef591e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Apply the latest database migration in your Supabase project (storage buckets for player photos/videos are created by `supabase/migrations/20261001000000_bidx_completion.sql`).
