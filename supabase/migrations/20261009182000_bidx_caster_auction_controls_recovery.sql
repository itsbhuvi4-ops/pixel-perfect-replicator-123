-- Keep caster auction controls aligned with the live Lovable database.
alter table public.auction_state
  add column if not exists bidding_deadline_at timestamptz,
  add column if not exists bidding_seconds_remaining integer;

-- Start can recover a stopped auction and selects the first eligible pool player atomically.
create or replace function public.caster_set_status(p_status public.auction_status)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st public.auction_state;
  nxt public.players;
  cur text;
  target text := p_status::text;
  ev text;
  msg text;
  selection jsonb := null;
  remaining integer;
begin
  if not (public.has_role(auth.uid(), 'caster') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Not authorized';
  end if;

  select * into st from public.auction_state where id = 1 for update;
  if st.id is null then raise exception 'Auction state is not configured'; end if;
  cur := st.status::text;

  if target = 'live' and cur in ('not_started', 'stopped') then
    if st.current_player_id is not null then
      raise exception 'Finish the current player before starting again';
    end if;

    select * into nxt
    from public.players
    where status = 'pool'
    order by random()
    limit 1
    for update skip locked;

    if nxt.id is null then
      update public.auction_state
      set status = 'completed', bidding_open = false,
          bidding_deadline_at = null, bidding_seconds_remaining = null,
          updated_at = now()
      where id = 1;
      insert into public.auction_events(event_type, message)
      values ('AUCTION_COMPLETED', 'Auction completed — pool is empty');
      return jsonb_build_object('ok', true, 'status', 'completed',
        'started', true, 'selection', jsonb_build_object('completed', true));
    end if;

    update public.players
    set status = 'in_auction', lot_number = coalesce(st.lot_counter, 0) + 1,
        updated_at = now()
    where id = nxt.id;

    update public.auction_state
    set status = 'live',
        current_player_id = nxt.id,
        current_bid = null,
        current_bidder_id = null,
        bidding_open = false,
        lot_counter = coalesce(st.lot_counter, 0) + 1,
        bidding_deadline_at = null,
        bidding_seconds_remaining = null,
        updated_at = now()
    where id = 1;

    insert into public.auction_events(event_type, message, player_id)
    values ('AUCTION_STARTED', 'Auction started', null),
           ('PLAYER_SELECTED', nxt.ingame_name || ' revealed', nxt.id);
    selection := jsonb_build_object('player_id', nxt.id, 'completed', false);
    return jsonb_build_object('ok', true, 'status', 'live', 'started', true, 'selection', selection);
  elsif cur = 'live' and target = 'paused' then
    ev := 'AUCTION_PAUSED'; msg := 'Auction paused';
  elsif cur = 'paused' and target = 'live' then
    ev := 'AUCTION_RESUMED'; msg := 'Auction resumed';
  elsif cur in ('live', 'paused') and target = 'stopped' then
    if st.current_player_id is not null then
      raise exception 'Finish the current player before ending the auction';
    end if;
    ev := 'AUCTION_STOPPED'; msg := 'Auction stopped';
  else
    raise exception 'Invalid status change: % to %', cur, target;
  end if;

  remaining := st.bidding_seconds_remaining;
  if target = 'paused' and st.bidding_open and st.bidding_deadline_at is not null then
    remaining := greatest(0, ceil(extract(epoch from (st.bidding_deadline_at - now())))::integer);
  end if;

  update public.auction_state
  set status = p_status,
      bidding_deadline_at = case
        when target in ('paused', 'stopped') then null
        when target = 'live' and cur = 'paused' and bidding_open
          then now() + make_interval(secs => greatest(0, coalesce(st.bidding_seconds_remaining, 0)))
        else bidding_deadline_at end,
      bidding_seconds_remaining = case
        when target = 'paused' then remaining
        when target = 'live' and cur = 'paused' and bidding_open then null
        when target = 'stopped' then null
        else bidding_seconds_remaining end,
      bidding_open = case when target = 'stopped' then false else bidding_open end,
      updated_at = now()
  where id = 1;

  insert into public.auction_events(event_type, message) values (ev, msg);
  return jsonb_build_object('ok', true, 'status', target);
end;
$$;

revoke all on function public.caster_set_status(public.auction_status) from public, anon;
grant execute on function public.caster_set_status(public.auction_status) to authenticated;
notify pgrst, 'reload schema';
