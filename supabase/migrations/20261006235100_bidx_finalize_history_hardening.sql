-- Finalization and UNSOLD paths must clear the authoritative deadline and write history snapshots.
create or replace function public.finalize_player_v3()
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare st public.auction_state; pl public.players; amb public.ambassadors; selected jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.auction_state where id=1 for update;
  if st.status::text<>'live' then raise exception 'Auction is not live'; end if;
  if st.current_player_id is null then raise exception 'No player on the block'; end if;
  select * into pl from public.players where id=st.current_player_id for update;
  if pl.status::text<>'in_auction' then raise exception 'Player already finalized'; end if;

  if st.current_bid is null or st.current_bidder_id is null then
    update public.players set status='unsold',updated_at=now() where id=pl.id;
    insert into public.auction_results(player_id,status,player_name_snapshot,ingame_name_snapshot,game_id_snapshot)
      values(pl.id,'unsold',pl.player_name,pl.ingame_name,pl.game_id);
    insert into public.auction_events(event_type,message,player_id,player_name_snapshot,ingame_name_snapshot,game_id_snapshot)
      values('PLAYER_UNSOLD',pl.ingame_name||' went UNSOLD',pl.id,pl.player_name,pl.ingame_name,pl.game_id);
    update public.auction_state set current_player_id=null,current_bid=null,current_bidder_id=null,
      bidding_open=false,bidding_deadline_at=null,bidding_seconds_remaining=null,updated_at=now() where id=1;
    select public.bidx_select_next_player_locked() into selected;
    return jsonb_build_object('ok',true,'result','unsold','next',selected);
  end if;

  select * into amb from public.ambassadors where id=st.current_bidder_id for update;
  if amb.id is null then raise exception 'Winning team not found'; end if;
  if amb.remaining_points<st.current_bid then raise exception 'Winning team has insufficient points'; end if;

  update public.ambassadors set remaining_points=remaining_points-st.current_bid,updated_at=now() where id=amb.id;
  update public.players set status='sold',sold_price=st.current_bid,ambassador_id=amb.id,sold_at=now(),
    sold_ambassador_name_snapshot=amb.ambassador_name,sold_team_name_snapshot=amb.team_name,updated_at=now() where id=pl.id;
  insert into public.auction_results(player_id,ambassador_id,winning_bid,status,player_name_snapshot,ingame_name_snapshot,
    game_id_snapshot,ambassador_name_snapshot,team_name_snapshot)
    values(pl.id,amb.id,st.current_bid,'sold',pl.player_name,pl.ingame_name,pl.game_id,amb.ambassador_name,amb.team_name);
  insert into public.auction_events(event_type,message,player_id,ambassador_id,amount,player_name_snapshot,
    ingame_name_snapshot,game_id_snapshot,ambassador_name_snapshot,team_name_snapshot)
    values('PLAYER_SOLD',pl.ingame_name||' SOLD to '||amb.team_name,pl.id,amb.id,st.current_bid,pl.player_name,
      pl.ingame_name,pl.game_id,amb.ambassador_name,amb.team_name);
  update public.auction_state set current_player_id=null,current_bid=null,current_bidder_id=null,
    bidding_open=false,bidding_deadline_at=null,bidding_seconds_remaining=null,updated_at=now() where id=1;
  select public.bidx_select_next_player_locked() into selected;
  return jsonb_build_object('ok',true,'result','sold','amount',st.current_bid,'next',selected);
end $$;

create or replace function public.caster_mark_unsold()
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare st public.auction_state; pl public.players; selected jsonb;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Not authorized'; end if;
  select * into st from public.auction_state where id=1 for update;
  if st.status::text<>'live' then raise exception 'Auction is not live'; end if;
  if st.current_player_id is null then raise exception 'No player on the block'; end if;
  select * into pl from public.players where id=st.current_player_id for update;
  if pl.status::text<>'in_auction' then raise exception 'Player already finalized'; end if;
  if st.current_bid is not null then raise exception 'A bid exists — finalize the highest bidder instead'; end if;

  update public.players set status='unsold',updated_at=now() where id=pl.id;
  insert into public.auction_results(player_id,status,player_name_snapshot,ingame_name_snapshot,game_id_snapshot)
    values(pl.id,'unsold',pl.player_name,pl.ingame_name,pl.game_id);
  insert into public.auction_events(event_type,message,player_id,player_name_snapshot,ingame_name_snapshot,game_id_snapshot)
    values('PLAYER_UNSOLD',pl.ingame_name||' went UNSOLD',pl.id,pl.player_name,pl.ingame_name,pl.game_id);
  update public.auction_state set current_player_id=null,current_bid=null,current_bidder_id=null,
    bidding_open=false,bidding_deadline_at=null,bidding_seconds_remaining=null,updated_at=now() where id=1;
  select public.bidx_select_next_player_locked() into selected;
  return jsonb_build_object('ok',true,'result','unsold','next',selected);
end $$;
