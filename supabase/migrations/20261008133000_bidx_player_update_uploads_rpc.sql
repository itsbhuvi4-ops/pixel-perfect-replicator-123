create or replace function public.player_update_uploads(
  p_photo_url text,
  p_video_url text
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
    raise exception 'Profile update limit reached';
  end if;

  if nullif(trim(coalesce(p_photo_url, '')), '') is null
     or nullif(trim(coalesce(p_video_url, '')), '') is null then
    raise exception 'Photo and video are required';
  end if;

  next_count := pl.information_change_count + 1;

  update public.players
  set photo_url = trim(p_photo_url),
      video_url = trim(p_video_url),
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

revoke all on function public.player_update_uploads(text,text) from public;
revoke all on function public.player_update_uploads(text,text) from anon;
grant execute on function public.player_update_uploads(text,text) to authenticated;
notify pgrst, 'reload schema';