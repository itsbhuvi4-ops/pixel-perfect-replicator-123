-- Restore the Player self-service RPC used by /my-player.
-- The RPC returns only the authenticated user's own player row.

create or replace function public.player_get_me()
returns setof public.players
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.players p
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.player_get_me() from public;
revoke all on function public.player_get_me() from anon;
grant execute on function public.player_get_me() to authenticated;
