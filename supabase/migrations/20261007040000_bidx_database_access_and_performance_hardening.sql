-- BidX Auction database access/performance hardening
-- Keeps public auction views read-only, removes anonymous base-table access,
-- adds the missing caster ownership index, and consolidates notification RLS.

revoke all on table public.bidx_public_players,
  public.bidx_public_ambassadors,
  public.bidx_public_auction_state,
  public.bidx_public_bids,
  public.bidx_public_auction_events
from anon, authenticated;

grant select on table public.bidx_public_players,
  public.bidx_public_ambassadors,
  public.bidx_public_auction_state,
  public.bidx_public_bids,
  public.bidx_public_auction_events
to anon, authenticated;

revoke select on table public.players,
  public.ambassadors,
  public.auction_state,
  public.bids,
  public.auction_events
from anon;

create index if not exists auction_state_caster_owner_idx
  on public.auction_state(caster_owner_id);

drop policy if exists "notification self read" on public.notifications;
drop policy if exists "notification self update" on public.notifications;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='notifications'
      and policyname='notifications own read'
  ) then
    create policy "notifications own read"
      on public.notifications
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='notifications'
      and policyname='notifications own mark read'
  ) then
    create policy "notifications own mark read"
      on public.notifications
      for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;