-- BidX Auction RLS policy performance hardening.
-- Cache auth/helper results once per statement instead of once per row.

alter policy "profiles self insert" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "profiles self or admin read" on public.profiles
  using (
    (select auth.uid()) = id
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  );

alter policy "profiles self update" on public.profiles
  using (
    (select auth.uid()) = id
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  )
  with check (
    (select auth.uid()) = id
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  );

alter policy "roles read own or admin" on public.user_roles
  using (
    user_id = (select auth.uid())
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  );

alter policy "ambassadors self profile update" on public.ambassadors
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "players self insert" on public.players
  with check ((select auth.uid()) = user_id);

alter policy "contacts owner or admin read" on public.player_contacts
  using (
    user_id = (select auth.uid())
    or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  );

alter policy "notifications own read" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "notifications own mark read" on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Admins can read deleted auction identities" on public.auction_deleted_identity
  using ((select public.has_role((select auth.uid()), 'admin'::public.app_role)));