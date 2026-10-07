# BIDXAUCTION Convex migration

This branch is the isolated Convex V2 backend track. Supabase remains the production source of truth until the Convex implementation passes full E2E verification.

## Target architecture

- Vite + React/TanStack frontend remains.
- Convex becomes the application database, server functions, realtime source of truth, scheduling layer, and file storage.
- Clerk is the planned authentication provider; Convex validates the Clerk identity server-side.
- WebRTC remains the media transport for caster video. Convex owns session/lease/signaling state; TURN remains a separate connectivity service.
- No Convex data path should depend on Supabase once the cutover is approved.

## Migration map

| Supabase | Convex V2 |
| --- | --- |
| profiles | users |
| user_roles | userRoles |
| players | players |
| ambassadors | ambassadors |
| casters | casters |
| player_contacts | playerContacts |
| player photos/videos | playerMedia + Convex storage |
| auction_state | auctionState |
| bids | bids |
| auction_events | auctionEvents |
| auction_results | auctionResults |
| retain_records | retainRecords |
| notifications | notifications |
| caster lease/session fields | casterSessions + auctionState |
| RLS policies | server-side authorization helpers |
| SQL RPCs | Convex mutations/actions |
| Postgres realtime | reactive Convex queries |
| Supabase Storage | Convex Storage |
| Supabase Auth | Clerk + Convex JWT validation |

## Auction invariants

1. Only authenticated users with the correct server-side role may mutate auction state.
2. The browser never chooses a winner or directly edits points.
3. Bid placement is transactional and validates auction state, player, bidder, minimum increment, points, deadline, and idempotency.
4. Finalization atomically records sold/unsold, deducts points, assigns the player, clears the active lot, and writes an event.
5. Next-player selection is server-controlled and random among eligible pool players.
6. Caster START/PAUSE/RESUME/STOP permissions are server-side.
7. Caster ownership is lease/session based; stale sessions cannot continue publishing control state.
8. Public queries expose only fields required by audience views.

## Cutover rule

Do not delete the Supabase project, credentials, migrations, or production data until:

- Convex schema/functions deploy cleanly.
- Auth works for all five roles.
- Player registration and media uploads work.
- Ambassador team/points work.
- Admin management and deletion work.
- Full auction lifecycle works.
- Concurrent bidding has been tested.
- Reconnect/refresh/mobile WebRTC has been tested.
- Vercel production build passes.
- A rollback plan has been exercised.

The final cutover will be a separate explicit step.
