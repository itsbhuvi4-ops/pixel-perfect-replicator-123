-- Public auction views use invoker security with column-level grants.
alter view public.bidx_public_players set (security_invoker=true);
alter view public.bidx_public_ambassadors set (security_invoker=true);
alter view public.bidx_public_auction_state set (security_invoker=true);
alter view public.bidx_public_bids set (security_invoker=true);
alter view public.bidx_public_auction_events set (security_invoker=true);

grant select(id,player_name,ingame_name,game_id,photo_url,video_url,primary_role,secondary_role,info,status,
  sold_price,ambassador_id,sold_at,lot_number,team_name,experience,created_at,updated_at) on public.players to anon,authenticated;
grant select(id,ambassador_name,team_name,photo_url,info,discord,starting_points,remaining_points,created_at,updated_at)
  on public.ambassadors to anon,authenticated;
grant select(id,status,current_player_id,current_bid,current_bidder_id,base_price,min_increment,lot_counter,max_players,
  max_ambassadors,max_casters,tournament_name,updated_at,default_starting_points,retain_price,max_retains,caster_cam_live,
  bidding_open,tournament_season,tournament_logo_url,auction_branding,caster_session_id,bidding_deadline_at)
  on public.auction_state to anon,authenticated;
grant select(id,player_id,ambassador_id,amount,created_at) on public.bids to anon,authenticated;
grant select(id,event_type,message,player_id,ambassador_id,amount,created_at,player_name_snapshot,ingame_name_snapshot,
  game_id_snapshot,ambassador_name_snapshot,team_name_snapshot) on public.auction_events to anon,authenticated;

drop policy if exists "players public read" on public.players;
drop policy if exists "players self or admin read" on public.players;
create policy "players safe read" on public.players for select to anon,authenticated using (true);
drop policy if exists "ambassadors public read" on public.ambassadors;
drop policy if exists "ambassadors self or admin read" on public.ambassadors;
create policy "ambassadors safe read" on public.ambassadors for select to anon,authenticated using (true);

create or replace function public.player_get_me()
returns setof public.players language sql security definer set search_path='public'
as $$ select p.* from public.players p where p.user_id=auth.uid() limit 1 $$;
create or replace function public.ambassador_get_me()
returns setof public.ambassadors language sql security definer set search_path='public'
as $$ select a.* from public.ambassadors a where a.user_id=auth.uid() limit 1 $$;
revoke execute on function public.player_get_me() from public,anon;
revoke execute on function public.ambassador_get_me() from public,anon;
grant execute on function public.player_get_me() to authenticated;
grant execute on function public.ambassador_get_me() to authenticated;


create policy "first admin claim is server only" on public.first_admin_setup_claim
for select to anon,authenticated using (false);
create index if not exists auction_state_current_player_idx on public.auction_state(current_player_id);
create index if not exists auction_state_current_bidder_idx on public.auction_state(current_bidder_id);
