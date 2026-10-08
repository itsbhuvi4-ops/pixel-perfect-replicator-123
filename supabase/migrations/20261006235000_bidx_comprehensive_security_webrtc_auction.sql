-- BIDXAUCTION comprehensive hardening
-- Safe to replay: schema additions are IF NOT EXISTS and functions/views are replaced in place.

alter table public.auction_state
  add column if not exists bidding_deadline_at timestamptz,
  add column if not exists bidding_seconds_remaining integer,
  add column if not exists caster_owner_id uuid references auth.users(id) on delete set null,
  add column if not exists caster_session_id uuid,
  add column if not exists caster_heartbeat_at timestamptz,
  add column if not exists caster_lease_until timestamptz;

create index if not exists auction_state_caster_lease_idx on public.auction_state(caster_lease_until);

create table if not exists public.first_admin_setup_claim (
  id boolean primary key default true check (id = true),
  claim_token uuid not null,
  claimed_until timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.first_admin_setup_claim enable row level security;
revoke all on public.first_admin_setup_claim from anon,authenticated;
grant all on public.first_admin_setup_claim to service_role;

create or replace function public.claim_first_admin_setup(p_token uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare claimed boolean := false;
begin
  if p_token is null then raise exception 'Invalid setup claim'; end if;
  insert into public.first_admin_setup_claim(id,claim_token,claimed_until)
  select true,p_token,now()+interval '2 minutes'
  where not exists(select 1 from public.user_roles where role='admin')
  on conflict(id) do update set claim_token=excluded.claim_token,claimed_until=excluded.claimed_until
    where public.first_admin_setup_claim.claimed_until<now()
      and not exists(select 1 from public.user_roles where role='admin');
  select exists(select 1 from public.first_admin_setup_claim
    where id=true and claim_token=p_token and claimed_until>now()) into claimed;
  return claimed;
end $$;

create or replace function public.release_first_admin_setup(p_token uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  delete from public.first_admin_setup_claim where id=true and claim_token=p_token;
  return true;
end $$;

revoke execute on function public.claim_first_admin_setup(uuid) from public,anon,authenticated;
revoke execute on function public.release_first_admin_setup(uuid) from public,anon,authenticated;
grant execute on function public.claim_first_admin_setup(uuid) to service_role;
grant execute on function public.release_first_admin_setup(uuid) to service_role;

create or replace function public.caster_claim_camera()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare st public.auction_state; session_id uuid:=gen_random_uuid(); uid uuid:=auth.uid();
begin
  if not public.is_staff(uid) then raise exception 'Not authorized'; end if;
  select * into st from public.auction_state where id=1 for update;
  if st.caster_owner_id is not null and st.caster_lease_until>now() and st.caster_owner_id<>uid
    then raise exception 'Another caster is already live'; end if;
  update public.auction_state set caster_owner_id=uid,caster_session_id=session_id,
    caster_heartbeat_at=now(),caster_lease_until=now()+interval '20 seconds',
    caster_cam_live=true,updated_at=now() where id=1;
  return jsonb_build_object('ok',true,'session_id',session_id);
end $$;

create or replace function public.caster_heartbeat_camera(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
  if not public.is_staff(uid) then raise exception 'Not authorized'; end if;
  update public.auction_state set caster_heartbeat_at=now(),
    caster_lease_until=now()+interval '20 seconds',caster_cam_live=true,updated_at=now()
  where id=1 and caster_owner_id=uid and caster_session_id=p_session_id and caster_lease_until>now();
  if not found then raise exception 'Caster session expired'; end if;
  return jsonb_build_object('ok',true,'lease_until',now()+interval '20 seconds');
end $$;

create or replace function public.caster_release_camera(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid();
begin
  if not public.is_staff(uid) then raise exception 'Not authorized'; end if;
  update public.auction_state set caster_owner_id=null,caster_session_id=null,
    caster_heartbeat_at=null,caster_lease_until=null,caster_cam_live=false,updated_at=now()
  where id=1 and caster_owner_id=uid and caster_session_id=p_session_id;
  return jsonb_build_object('ok',true);
end $$;

revoke execute on function public.caster_claim_camera() from public,anon,authenticated;
revoke execute on function public.caster_heartbeat_camera(uuid) from public,anon,authenticated;
revoke execute on function public.caster_release_camera(uuid) from public,anon,authenticated;
grant execute on function public.caster_claim_camera() to authenticated;
grant execute on function public.caster_heartbeat_camera(uuid) to authenticated;
grant execute on function public.caster_release_camera(uuid) to authenticated;

create or replace function public.caster_open_bidding()
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare st public.auction_state; pl public.players;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.auction_state where id=1 for update;
  if st.status::text<>'live' then raise exception 'Auction is not live'; end if;
  if st.current_player_id is null then raise exception 'Reveal a player first'; end if;
  if st.bidding_open then raise exception 'Bidding is already open'; end if;
  select * into pl from public.players where id=st.current_player_id;
  update public.auction_state set bidding_open=true,bidding_deadline_at=now()+interval '30 seconds',
    bidding_seconds_remaining=30,updated_at=now() where id=1;
  insert into public.auction_events(event_type,message,player_id)
    values('BIDDING_OPEN','Bidding open for '||pl.ingame_name,pl.id);
  return jsonb_build_object('ok',true,'deadline_at',now()+interval '30 seconds');
end $$;

create or replace function public.place_bid_v3(p_amount bigint,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare st public.auction_state; amb public.ambassadors; pl public.players;
  min_needed bigint; inserted_count integer;
begin
  if p_idempotency_key is null or length(p_idempotency_key)<8 or length(p_idempotency_key)>100
    then raise exception 'Invalid request key'; end if;
  select * into st from public.auction_state where id=1 for update;
  if st.status::text='paused' then raise exception 'Auction is currently paused'; end if;
  if st.status::text<>'live' then raise exception 'Auction is not live'; end if;
  if st.current_player_id is null then raise exception 'No player on the block'; end if;
  if not st.bidding_open then raise exception 'Bidding is not open yet'; end if;
  if st.bidding_deadline_at is null or now()>st.bidding_deadline_at then raise exception 'Bidding time has expired'; end if;
  select * into pl from public.players where id=st.current_player_id;
  if pl.status::text<>'in_auction' then raise exception 'Player is no longer being auctioned'; end if;
  if not public.has_role(auth.uid(),'ambassador') or not public.is_active_user(auth.uid())
    then raise exception 'Only active ambassadors can bid'; end if;
  select * into amb from public.ambassadors where user_id=auth.uid() for update;
  if amb.id is null then raise exception 'Only active ambassadors can bid'; end if;
  min_needed:=case when st.current_bid is null then st.base_price else st.current_bid+st.min_increment end;
  if p_amount<min_needed then raise exception 'Bid must be at least %',min_needed; end if;
  if st.current_bidder_id=amb.id then raise exception 'You are already the highest bidder'; end if;
  if p_amount>amb.remaining_points then raise exception 'Not enough points'; end if;
  insert into public.bids(player_id,ambassador_id,amount,idempotency_key)
    values(st.current_player_id,amb.id,p_amount,p_idempotency_key)
    on conflict(idempotency_key) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=0 then return jsonb_build_object('ok',true,'duplicate',true); end if;
  update public.auction_state set current_bid=p_amount,current_bidder_id=amb.id,updated_at=now() where id=1;
  insert into public.auction_events(event_type,message,player_id,ambassador_id,amount)
    values('BID_PLACED',amb.team_name||' bid '||p_amount::text,st.current_player_id,amb.id,p_amount);
  return jsonb_build_object('ok',true,'amount',p_amount);
end $$;

create or replace function public.caster_set_status(p_status public.auction_status)
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare st public.auction_state; cur text; nxt text:=p_status::text; ev text; selected jsonb; remaining integer;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.auction_state where id=1 for update; cur:=st.status::text;
  if cur='not_started' and nxt='live' then ev:='AUCTION_STARTED';
  elsif cur='live' and nxt='paused' then ev:='AUCTION_PAUSED';
  elsif cur='paused' and nxt='live' then ev:='AUCTION_RESUMED';
  elsif cur in('live','paused') and nxt='stopped' then ev:='AUCTION_STOPPED';
  else raise exception 'Invalid status change'; end if;
  if nxt='stopped' and st.current_player_id is not null then
    raise exception 'Finish the current player before ending the auction'; end if;
  remaining:=st.bidding_seconds_remaining;
  if nxt='paused' and st.bidding_open and st.bidding_deadline_at is not null then
    remaining:=greatest(0,ceil(extract(epoch from(st.bidding_deadline_at-now())))::integer);
  elsif nxt='live' and cur='paused' and st.bidding_open and coalesce(st.bidding_seconds_remaining,0)<=0 then
    raise exception 'Bidding time has expired';
  end if;
  update public.auction_state set status=p_status,
    bidding_deadline_at=case
      when nxt='paused' then null
      when nxt='live' and cur='paused' and bidding_open then now()+make_interval(secs=>greatest(0,coalesce(st.bidding_seconds_remaining,0)))
      when nxt='stopped' then null else bidding_deadline_at end,
    bidding_seconds_remaining=case
      when nxt='paused' then remaining
      when nxt='live' and cur='paused' and bidding_open then null
      when nxt='stopped' then null else bidding_seconds_remaining end,
    bidding_open=case when nxt='stopped' then false else bidding_open end,updated_at=now() where id=1;
  insert into public.auction_events(event_type,message) values(ev,replace(initcap(replace(ev,'_',' ')),'Auction ','Auction '));
  if nxt='live' and cur='not_started' then
    select public.bidx_select_next_player_locked() into selected;
    return jsonb_build_object('ok',true,'status',nxt,'started',true,'selection',selected);
  end if;
  return jsonb_build_object('ok',true,'status',nxt);
end $$;

create or replace function public.snapshot_player_before_delete()
returns trigger language plpgsql security definer set search_path='public'
as $$
begin
  insert into public.auction_deleted_identity(entity_type,entity_id,player_name,ingame_name,game_id,team_name,ambassador_name)
  select 'player',OLD.id,OLD.player_name,OLD.ingame_name,OLD.game_id,OLD.team_name,
    coalesce(OLD.sold_ambassador_name_snapshot,a.ambassador_name)
  from public.ambassadors a where a.id=OLD.ambassador_id
  union all
  select 'player',OLD.id,OLD.player_name,OLD.ingame_name,OLD.game_id,OLD.team_name,OLD.sold_ambassador_name_snapshot
  where OLD.ambassador_id is null
  on conflict(entity_type,entity_id) do update set player_name=excluded.player_name,
    ingame_name=excluded.ingame_name,game_id=excluded.game_id,team_name=excluded.team_name,
    ambassador_name=excluded.ambassador_name,deleted_at=now();
  update public.auction_results set
    player_name_snapshot=coalesce(player_name_snapshot,OLD.player_name),
    ingame_name_snapshot=coalesce(ingame_name_snapshot,OLD.ingame_name),
    game_id_snapshot=coalesce(game_id_snapshot,OLD.game_id),
    ambassador_name_snapshot=coalesce(ambassador_name_snapshot,OLD.sold_ambassador_name_snapshot),
    team_name_snapshot=coalesce(team_name_snapshot,OLD.sold_team_name_snapshot)
    where player_id=OLD.id;
  update public.bids set player_name_snapshot=coalesce(player_name_snapshot,OLD.player_name),
    ingame_name_snapshot=coalesce(ingame_name_snapshot,OLD.ingame_name) where player_id=OLD.id;
  update public.retain_records set player_name_snapshot=coalesce(player_name_snapshot,OLD.player_name),
    ingame_name_snapshot=coalesce(ingame_name_snapshot,OLD.ingame_name) where player_id=OLD.id;
  return OLD;
end $$;

create or replace function public.snapshot_ambassador_before_delete()
returns trigger language plpgsql security definer set search_path='public'
as $$
begin
  insert into public.auction_deleted_identity(entity_type,entity_id,ambassador_name,team_name)
    values('ambassador',OLD.id,OLD.ambassador_name,OLD.team_name)
    on conflict(entity_type,entity_id) do update set ambassador_name=excluded.ambassador_name,
      team_name=excluded.team_name,deleted_at=now();
  update public.auction_results set ambassador_name_snapshot=coalesce(ambassador_name_snapshot,OLD.ambassador_name),
    team_name_snapshot=coalesce(team_name_snapshot,OLD.team_name) where ambassador_id=OLD.id;
  update public.bids set ambassador_name_snapshot=coalesce(ambassador_name_snapshot,OLD.ambassador_name),
    team_name_snapshot=coalesce(team_name_snapshot,OLD.team_name) where ambassador_id=OLD.id;
  update public.retain_records set ambassador_name_snapshot=coalesce(ambassador_name_snapshot,OLD.ambassador_name),
    team_name_snapshot=coalesce(team_name_snapshot,OLD.team_name) where ambassador_id=OLD.id;
  update public.players set sold_ambassador_name_snapshot=coalesce(sold_ambassador_name_snapshot,OLD.ambassador_name),
    sold_team_name_snapshot=coalesce(sold_team_name_snapshot,OLD.team_name) where ambassador_id=OLD.id;
  return OLD;
end $$;

create or replace view public.bidx_public_players as
select id,player_name,ingame_name,game_id,photo_url,video_url,primary_role,secondary_role,info,status,
       sold_price,ambassador_id,sold_at,lot_number,team_name,experience,created_at,updated_at from public.players;
create or replace view public.bidx_public_ambassadors as
select id,ambassador_name,team_name,photo_url,info,discord,starting_points,remaining_points,created_at,updated_at from public.ambassadors;
create or replace view public.bidx_public_auction_state as
select id,status,current_player_id,current_bid,current_bidder_id,base_price,min_increment,lot_counter,
       max_players,max_ambassadors,max_casters,tournament_name,updated_at,default_starting_points,retain_price,max_retains,
       case when caster_cam_live and caster_lease_until>now() then true else false end as caster_cam_live,
       bidding_open,tournament_season,tournament_logo_url,auction_branding,
       case when caster_cam_live and caster_lease_until>now() then caster_session_id else null end as caster_session_id,
       bidding_deadline_at from public.auction_state;
create or replace view public.bidx_public_bids as select id,player_id,ambassador_id,amount,created_at from public.bids;
create or replace view public.bidx_public_auction_events as
select id,event_type,message,player_id,ambassador_id,amount,created_at,player_name_snapshot,
       ingame_name_snapshot,game_id_snapshot,ambassador_name_snapshot,team_name_snapshot from public.auction_events;
grant select on public.bidx_public_players,public.bidx_public_ambassadors,public.bidx_public_auction_state,
  public.bidx_public_bids,public.bidx_public_auction_events to anon,authenticated;

revoke all on public.profiles,public.user_roles,public.player_contacts,public.casters,public.auction_results,
  public.retain_records,public.auction_deleted_identity,public.webrtc_signals,public.notifications from anon;
revoke select on public.auction_state,public.bids,public.auction_events from anon,authenticated;
grant select on public.players,public.ambassadors to authenticated;

drop policy if exists "players public read" on public.players;
create policy "players self or admin read" on public.players for select to authenticated
using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "ambassadors public read" on public.ambassadors;
create policy "ambassadors self or admin read" on public.ambassadors for select to authenticated
using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role));
drop policy if exists "profiles authenticated read" on public.profiles;
create policy "profiles self or admin read" on public.profiles for select to authenticated
using(id=auth.uid() or public.has_role(auth.uid(),'admin'::public.app_role));

update storage.buckets set public=true,file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'] where id='player-photos';
update storage.buckets set public=true,file_size_limit=104857600,
  allowed_mime_types=array['video/mp4','video/webm','video/quicktime'] where id='player-videos';

revoke execute on function public.rls_auto_enable() from public,anon,authenticated;


-- Single active caster host / standby failover support.
CREATE OR REPLACE FUNCTION public.caster_host_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  uid uuid := auth.uid();
  active boolean;
  host_name text;
BEGIN
  IF NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id=1;
  active := st.caster_owner_id IS NOT NULL
    AND st.caster_lease_until IS NOT NULL
    AND st.caster_lease_until > now();
  SELECT caster_name INTO host_name FROM public.casters WHERE user_id=st.caster_owner_id;
  RETURN jsonb_build_object(
    'host_active', active,
    'is_current_user_host', active AND st.caster_owner_id=uid,
    'host_name', CASE WHEN active THEN host_name ELSE NULL END,
    'lease_until', CASE WHEN active THEN st.caster_lease_until ELSE NULL END
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_release_caster_host()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.auction_state
  SET caster_owner_id=NULL,caster_session_id=NULL,caster_heartbeat_at=NULL,
      caster_lease_until=NULL,caster_cam_live=false,updated_at=now()
  WHERE id=1;
  RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION public.caster_host_status() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_release_caster_host() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.caster_host_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_caster_host() TO authenticated;
NOTIFY pgrst,'reload schema';


-- Ensure the live schema has the caster lease columns before the host RPCs/views use them.
ALTER TABLE public.auction_state
  ADD COLUMN IF NOT EXISTS caster_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS caster_session_id uuid,
  ADD COLUMN IF NOT EXISTS caster_heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS caster_lease_until timestamptz;

CREATE INDEX IF NOT EXISTS auction_state_caster_lease_idx
  ON public.auction_state(caster_lease_until);

CREATE OR REPLACE FUNCTION public.caster_claim_camera()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  uid uuid := auth.uid(); session_id uuid := gen_random_uuid();
  lease_until timestamptz := now()+interval '20 seconds';
  st public.auction_state;
BEGIN
  IF NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id=1 FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Auction state is not configured'; END IF;
  IF st.caster_owner_id IS NOT NULL AND st.caster_lease_until > now()
     AND st.caster_owner_id <> uid
  THEN RAISE EXCEPTION 'Another caster is already hosting the auction'; END IF;
  UPDATE public.auction_state
  SET caster_owner_id=uid,caster_session_id=session_id,caster_heartbeat_at=now(),
      caster_lease_until=lease_until,caster_cam_live=true,updated_at=now()
  WHERE id=1;
  RETURN jsonb_build_object('ok',true,'session_id',session_id,'host',true,'lease_until',lease_until);
END $$;

CREATE OR REPLACE FUNCTION public.caster_heartbeat_camera(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE uid uuid:=auth.uid(); lease_until timestamptz:=now()+interval '20 seconds';
BEGIN
  IF NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.auction_state
  SET caster_heartbeat_at=now(),caster_lease_until=lease_until,caster_cam_live=true,updated_at=now()
  WHERE id=1 AND caster_owner_id=uid AND caster_session_id=p_session_id AND caster_lease_until>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Caster session expired or another caster is hosting'; END IF;
  RETURN jsonb_build_object('ok',true,'lease_until',lease_until);
END $$;

CREATE OR REPLACE FUNCTION public.caster_release_camera(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.auction_state
  SET caster_owner_id=NULL,caster_session_id=NULL,caster_heartbeat_at=NULL,
      caster_lease_until=NULL,caster_cam_live=false,updated_at=now()
  WHERE id=1 AND caster_owner_id=uid AND caster_session_id=p_session_id;
  RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION public.caster_claim_camera() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.caster_heartbeat_camera(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.caster_release_camera(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.caster_claim_camera() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_heartbeat_camera(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_release_camera(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
