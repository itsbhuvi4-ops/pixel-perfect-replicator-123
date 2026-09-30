-- BidX Auction completion compatibility migration
alter table if exists public.profiles add column if not exists must_change_password boolean not null default false;
alter table if exists public.profiles add column if not exists is_active boolean not null default true;
alter table if exists public.players add column if not exists phone_number text;
alter table if exists public.players add column if not exists team_name text;
alter table if exists public.players add column if not exists experience text;
alter table if exists public.players add column if not exists submitted_at timestamptz;
alter table if exists public.auction_state add column if not exists bidding_open boolean not null default false;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'auction',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.notifications enable row level security;
drop policy if exists "notification self read" on public.notifications;
create policy "notification self read" on public.notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists "notification self update" on public.notifications;
create policy "notification self update" on public.notifications for update to authenticated using (user_id=auth.uid());

create table if not exists public.webrtc_signals (
  id bigint generated always as identity primary key,
  room_id text not null,
  sender_id text not null,
  target_id text not null,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.webrtc_signals enable row level security;
drop policy if exists "webrtc authenticated insert" on public.webrtc_signals;
create policy "webrtc authenticated insert" on public.webrtc_signals for insert to authenticated with check (true);
drop policy if exists "webrtc authenticated read" on public.webrtc_signals;
create policy "webrtc authenticated read" on public.webrtc_signals for select to authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.webrtc_signals;
exception when duplicate_object then null;
end $$;

create or replace view public.auction_teams_public as
select id, team_name, ambassador_name from public.ambassadors;
grant select on public.auction_teams_public to anon, authenticated;

create or replace view public.auction_players_public as
select p.id,p.player_name,p.ingame_name,p.game_id,p.photo_url,p.video_url,p.primary_role,p.secondary_role,
       p.team_name,p.experience,p.status,p.sold_price,p.ambassador_id,p.sold_at,p.lot_number,p.created_at
from public.players p
join public.auction_state s on s.current_player_id=p.id;
grant select on public.auction_players_public to anon, authenticated;

create index if not exists bids_player_time_idx on public.bids(player_id, created_at desc);
create index if not exists notifications_user_time_idx on public.notifications(user_id, created_at desc);
