-- BidX Auction: production account/profile update limits and history-safe deletion.
-- Uses the existing schema only; no new role enum is introduced.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS player_upload_prompt_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS uid text;

CREATE UNIQUE INDEX IF NOT EXISTS players_uid_unique
  ON public.players (uid)
  WHERE uid IS NOT NULL;

-- Auction history must survive deletion of the login/profile row.
-- Immutable history rows are never updated/deleted during account removal.
-- Identity is archived in a separate table before the role row is removed.
CREATE TABLE IF NOT EXISTS public.auction_deleted_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('player','ambassador')),
  entity_id uuid NOT NULL,
  player_name text,
  ingame_name text,
  game_id text,
  team_name text,
  ambassador_name text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

ALTER TABLE public.auction_deleted_identity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read deleted auction identities" ON public.auction_deleted_identity;
CREATE POLICY "Admins can read deleted auction identities"
ON public.auction_deleted_identity FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.snapshot_player_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auction_deleted_identity(entity_type,entity_id,player_name,ingame_name,game_id,team_name)
  VALUES ('player',OLD.id,OLD.player_name,OLD.ingame_name,OLD.game_id,OLD.team_name)
  ON CONFLICT (entity_type,entity_id) DO UPDATE SET
    player_name=EXCLUDED.player_name, ingame_name=EXCLUDED.ingame_name,
    game_id=EXCLUDED.game_id, team_name=EXCLUDED.team_name, deleted_at=now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_ambassador_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auction_deleted_identity(entity_type,entity_id,ambassador_name,team_name)
  VALUES ('ambassador',OLD.id,OLD.ambassador_name,OLD.team_name)
  ON CONFLICT (entity_type,entity_id) DO UPDATE SET
    ambassador_name=EXCLUDED.ambassador_name, team_name=EXCLUDED.team_name, deleted_at=now();
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_player_before_delete ON public.players;
CREATE TRIGGER snapshot_player_before_delete BEFORE DELETE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.snapshot_player_before_delete();

DROP TRIGGER IF EXISTS snapshot_ambassador_before_delete ON public.ambassadors;
CREATE TRIGGER snapshot_ambassador_before_delete BEFORE DELETE ON public.ambassadors
FOR EACH ROW EXECUTE FUNCTION public.snapshot_ambassador_before_delete();

ALTER TABLE public.auction_results
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS game_id_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;

ALTER TABLE public.auction_results
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE public.auction_results
  DROP CONSTRAINT IF EXISTS auction_results_player_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_results_ambassador_id_fkey;

ALTER TABLE public.auction_results
  ADD CONSTRAINT auction_results_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT auction_results_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

-- Preserve bid history while allowing the account rows to disappear.
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;

ALTER TABLE public.bids
  ALTER COLUMN player_id DROP NOT NULL,
  ALTER COLUMN ambassador_id DROP NOT NULL;

ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_player_id_fkey,
  DROP CONSTRAINT IF EXISTS bids_ambassador_id_fkey;

ALTER TABLE public.bids
  ADD CONSTRAINT bids_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT bids_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

-- Retain history is already immutable; keep its snapshots and nullable references.
ALTER TABLE public.retain_records
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;

ALTER TABLE public.retain_records
  ALTER COLUMN player_id DROP NOT NULL,
  ALTER COLUMN ambassador_id DROP NOT NULL;

ALTER TABLE public.retain_records
  DROP CONSTRAINT IF EXISTS retain_records_player_id_fkey,
  DROP CONSTRAINT IF EXISTS retain_records_ambassador_id_fkey;

ALTER TABLE public.retain_records
  ADD CONSTRAINT retain_records_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT retain_records_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

-- All profile/media changes consume the same server-side 3-update budget.
CREATE OR REPLACE FUNCTION public.player_update_uploads(
  p_photo_url text,
  p_video_url text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$$
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
    RAISE EXCEPTION 'You have reached the maximum limit of 3 profile updates. You can no longer modify your player information, photos, or videos.';
  END IF;

  IF p_photo_url IS NULL OR length(trim(p_photo_url)) = 0 THEN
    RAISE EXCEPTION 'Photo is required';
  END IF;

  IF p_video_url IS NULL OR length(trim(p_video_url)) = 0 THEN
    RAISE EXCEPTION 'Video is required';
  END IF;

  UPDATE public.players
  SET photo_url = trim(p_photo_url),
      video_url = trim(p_video_url),
      information_change_count = information_change_count + 1,
      updated_at = now()
  WHERE id = pl.id;

  RETURN jsonb_build_object(
    'ok', true,
    'information_change_count', pl.information_change_count + 1,
    'remaining_changes', greatest(0, 2 - pl.information_change_count)
  );
END;
$$$;

REVOKE ALL ON FUNCTION public.player_update_uploads(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_update_uploads(text,text) TO authenticated;

-- Only the player may consume their own prompt flag.
CREATE OR REPLACE FUNCTION public.mark_player_upload_prompt_seen()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$$
BEGIN
  IF NOT public.has_role(auth.uid(), 'player') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET player_upload_prompt_seen = true,
      updated_at = now()
  WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true);
END;
$$$;

REVOKE ALL ON FUNCTION public.mark_player_upload_prompt_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_player_upload_prompt_seen() TO authenticated;

CREATE OR REPLACE FUNCTION public.player_update_profile(
  p_player_name text,
  p_ingame_name text,
  p_game_id text,
  p_uid text,
  p_experience text,
  p_team_name text,
  p_primary_role public.game_role,
  p_secondary_role public.game_role,
  p_info text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pl public.players;
BEGIN
  SELECT * INTO pl FROM public.players WHERE user_id = auth.uid() FOR UPDATE;
  IF pl.id IS NULL THEN RAISE EXCEPTION 'Player profile not found'; END IF;
  IF pl.information_change_count >= 3 THEN
    RAISE EXCEPTION 'You have reached the maximum limit of 3 profile updates. You can no longer modify your player information, photos, or videos.';
  END IF;
  IF length(trim(p_player_name)) < 2 OR length(trim(p_ingame_name)) < 2
     OR length(trim(p_game_id)) < 3 OR length(trim(p_uid)) < 3
     OR length(trim(p_experience)) < 1 OR length(trim(p_team_name)) < 1 THEN
    RAISE EXCEPTION 'Player information is incomplete';
  END IF;

  UPDATE public.players
  SET player_name = trim(p_player_name),
      ingame_name = trim(p_ingame_name),
      game_id = trim(p_game_id),
      uid = trim(p_uid),
      experience = trim(p_experience),
      team_name = trim(p_team_name),
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

REVOKE ALL ON FUNCTION public.player_update_profile(text,text,text,text,text,text,public.game_role,public.game_role,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_update_profile(text,text,text,text,text,text,public.game_role,public.game_role,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
