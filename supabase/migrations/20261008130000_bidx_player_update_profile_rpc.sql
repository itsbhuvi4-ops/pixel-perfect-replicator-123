-- BidX Auction: restore the player profile update RPC used by the current player UI.
-- The live database can otherwise report "Could not find the function ... in the schema cache".
create or replace function public.player_update_profile(
  p_player_name text,
  p_ingame_name text,
  p_game_id text,
  p_uid text,
  p_experience text,
  p_team_name text,
  p_primary_role public.game_role,
  p_secondary_role public.game_role,
  p_info text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
  next_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into pl
  from public.players
  where user_id = auth.uid()
  for update;

  if pl.id is null then
    raise exception 'Player profile not found';
  end if;

  if pl.information_change_count >= 3 then
    raise exception 'Information edit limit reached';
  end if;

  if length(trim(coalesce(p_player_name, ''))) < 2
     or length(trim(coalesce(p_ingame_name, ''))) < 2
     or length(trim(coalesce(p_game_id, ''))) < 3
     or length(trim(coalesce(p_uid, ''))) < 1
     or length(trim(coalesce(p_experience, ''))) < 1
     or length(trim(coalesce(p_team_name, ''))) < 1 then
    raise exception 'Player information is incomplete';
  end if;

  next_count := pl.information_change_count + 1;

  update public.players
  set player_name = trim(p_player_name),
      ingame_name = trim(p_ingame_name),
      game_id = trim(p_game_id),
      uid = trim(p_uid),
      experience = trim(p_experience),
      team_name = trim(p_team_name),
      primary_role = p_primary_role,
      secondary_role = p_secondary_role,
      info = nullif(trim(coalesce(p_info, '')), ''),
      information_change_count = next_count,
      updated_at = now()
  where id = pl.id;

  return jsonb_build_object(
    'ok', true,
    'information_change_count', next_count,
    'remaining_changes', greatest(0, 3 - next_count)
  );
end;
$$;

revoke all on function public.player_update_profile(text,text,text,text,text,text,public.game_role,public.game_role,text) from public;
revoke all on function public.player_update_profile(text,text,text,text,text,text,public.game_role,public.game_role,text) from anon;
grant execute on function public.player_update_profile(text,text,text,text,text,text,public.game_role,public.game_role,text) to authenticated;

notify pgrst, 'reload schema';
