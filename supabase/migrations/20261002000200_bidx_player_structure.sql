-- Bid X Auction: exact player profile/information/upload structure.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS information_change_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "players self update limited" ON public.players;

CREATE OR REPLACE FUNCTION public.player_update_information(
  p_player_name text,
  p_ingame_name text,
  p_game_id text,
  p_primary_role public.game_role,
  p_secondary_role public.game_role,
  p_info text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl public.players;
BEGIN
  SELECT * INTO pl
  FROM public.players
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF pl.id IS NULL THEN
    RAISE EXCEPTION 'Player profile not found';
  END IF;

  IF pl.information_change_count >= 3 THEN
    RAISE EXCEPTION 'Information edit limit reached';
  END IF;

  IF length(trim(p_player_name)) < 2 OR length(trim(p_ingame_name)) < 2 OR length(trim(p_game_id)) < 3 THEN
    RAISE EXCEPTION 'Player information is incomplete';
  END IF;

  UPDATE public.players
  SET player_name = trim(p_player_name),
      ingame_name = trim(p_ingame_name),
      game_id = trim(p_game_id),
      primary_role = p_primary_role,
      secondary_role = p_secondary_role,
      info = nullif(trim(p_info), ''),
      information_change_count = information_change_count + 1,
      updated_at = now()
  WHERE id = pl.id;

  RETURN jsonb_build_object(
    'ok', true,
    'information_change_count', pl.information_change_count + 1,
    'remaining_changes', 2 - pl.information_change_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.player_update_uploads(
  p_photo_url text,
  p_video_url text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pl public.players;
BEGIN
  SELECT * INTO pl
  FROM public.players
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF pl.id IS NULL THEN
    RAISE EXCEPTION 'Player profile not found';
  END IF;

  IF p_photo_url IS NULL OR length(trim(p_photo_url)) = 0 THEN
    RAISE EXCEPTION 'Photo is required';
  END IF;

  IF p_video_url IS NULL OR length(trim(p_video_url)) = 0 THEN
    RAISE EXCEPTION 'Video is required';
  END IF;

  IF pl.video_url IS NOT NULL AND pl.video_url IS DISTINCT FROM p_video_url THEN
    RAISE EXCEPTION 'Video is already uploaded and cannot be replaced';
  END IF;

  UPDATE public.players
  SET photo_url = trim(p_photo_url),
      video_url = trim(p_video_url),
      updated_at = now()
  WHERE id = pl.id;

  RETURN jsonb_build_object(
    'ok', true,
    'setup_complete', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.player_update_information(text,text,text,public.game_role,public.game_role,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_update_information(text,text,text,public.game_role,public.game_role,text) TO authenticated;

REVOKE ALL ON FUNCTION public.player_update_uploads(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_update_uploads(text,text) TO authenticated;
