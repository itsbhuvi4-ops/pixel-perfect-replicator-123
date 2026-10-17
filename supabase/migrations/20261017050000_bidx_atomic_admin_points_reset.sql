-- Reset ambassador balances only while the auction is still not_started.
-- The row lock serializes this operation with caster_set_status, which also
-- locks auction_state before starting, pausing, resuming, or stopping an auction.
create or replace function public.admin_reset_ambassador_points_if_not_started(p_points bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st public.auction_state;
  affected integer;
begin
  -- This RPC is intentionally callable only through the trusted server client.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_points is null or p_points < 0 or p_points > 10000000 then
    raise exception 'Invalid starting points';
  end if;

  select * into st
  from public.auction_state
  where id = 1
  for update;

  if st.id is null then
    raise exception 'Auction state is not configured';
  end if;

  if st.status <> 'not_started' then
    raise exception 'Team points can only be reset before the auction starts';
  end if;

  update public.ambassadors
  set starting_points = p_points,
      remaining_points = p_points,
      updated_at = now()
  where starting_points >= 0;

  get diagnostics affected = row_count;
  return jsonb_build_object('ok', true, 'updated', affected);
end;
$$;

revoke all on function public.admin_reset_ambassador_points_if_not_started(bigint) from public, anon, authenticated;
grant execute on function public.admin_reset_ambassador_points_if_not_started(bigint) to service_role;

notify pgrst, 'reload schema';
