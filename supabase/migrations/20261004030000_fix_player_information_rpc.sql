-- BidX Auction: repair the player information RPC signature and refresh PostgREST schema cache.
-- The deployed database may contain an older definition with a different parameter
-- naming/order. PostgREST resolves RPC calls by named arguments, so recreate the
-- function with the exact names used by the player UI.

DROP FUNCTION IF EXISTS public.player_update_information(text,text,text,public.game_role,public.game_role,text);

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

  IF length(trim(coalesce(p_player_name, ''))) < 2
     OR length(trim(coalesce(p_ingame_name, ''))) < 2
     OR length(trim(coalesce(p_game_id, ''))) < 3 THEN
    RAISE EXCEPTION 'Player information is incomplete';
  END IF;

  UPDATE public.players
  SET player_name = trim(p_player_name),
      ingame_name = trim(p_ingame_name),
      game_id = trim(p_game_id),
      primary_role = p_primary_role,
      secondary_role = p_secondary_role,
      info = nullif(trim(coalesce(p_info, '')), ''),
      information_change_count = information_change_count + 1,
      updated_at = now()
  WHERE id = pl.id;

  RETURN jsonb_build_object(
    'ok', true,
    'information_change_count', pl.information_change_count + 1,
    'remaining_changes', greatest(0, 2 - pl.information_change_count)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.player_update_information(text,text,text,public.game_role,public.game_role,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_update_information(text,text,text,public.game_role,public.game_role,text) TO authenticated;

-- Tell PostgREST to reload its schema cache immediately after the migration.
NOTIFY pgrst, 'reload schema';
