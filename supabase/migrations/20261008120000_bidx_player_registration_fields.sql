-- Keep the live Player registration schema aligned with the application.
-- Safe/idempotent: existing data is preserved.

alter table public.players
  add column if not exists uid text;

alter table public.players
  add column if not exists information_change_count integer not null default 0;

create unique index if not exists players_uid_unique
  on public.players (uid)
  where uid is not null;

notify pgrst, 'reload schema';
