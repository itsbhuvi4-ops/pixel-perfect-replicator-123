-- BIDXAUCTION: reconcile the production Lovable database with the admin
-- reset/deletion contract used by the application.
-- This migration is intentionally idempotent so a deployment can safely apply it
-- even when part of the repair already exists.

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

DROP POLICY IF EXISTS "Admins can read deleted auction identities"
  ON public.auction_deleted_identity;
CREATE POLICY "Admins can read deleted auction identities"
ON public.auction_deleted_identity FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.snapshot_player_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
CREATE TRIGGER snapshot_player_before_delete
BEFORE DELETE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.snapshot_player_before_delete();

DROP TRIGGER IF EXISTS snapshot_ambassador_before_delete ON public.ambassadors;
CREATE TRIGGER snapshot_ambassador_before_delete
BEFORE DELETE ON public.ambassadors
FOR EACH ROW EXECUTE FUNCTION public.snapshot_ambassador_before_delete();

ALTER TABLE public.auction_results
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS game_id_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;
ALTER TABLE public.auction_results ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE public.auction_results
  DROP CONSTRAINT IF EXISTS auction_results_player_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_results_ambassador_id_fkey;
ALTER TABLE public.auction_results
  ADD CONSTRAINT auction_results_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT auction_results_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;
ALTER TABLE public.bids ALTER COLUMN player_id DROP NOT NULL, ALTER COLUMN ambassador_id DROP NOT NULL;
ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_player_id_fkey,
  DROP CONSTRAINT IF EXISTS bids_ambassador_id_fkey;
ALTER TABLE public.bids
  ADD CONSTRAINT bids_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT bids_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.retain_records
  ADD COLUMN IF NOT EXISTS player_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ingame_name_snapshot text,
  ADD COLUMN IF NOT EXISTS ambassador_name_snapshot text,
  ADD COLUMN IF NOT EXISTS team_name_snapshot text;
ALTER TABLE public.retain_records ALTER COLUMN player_id DROP NOT NULL, ALTER COLUMN ambassador_id DROP NOT NULL;
ALTER TABLE public.retain_records
  DROP CONSTRAINT IF EXISTS retain_records_player_id_fkey,
  DROP CONSTRAINT IF EXISTS retain_records_ambassador_id_fkey;
ALTER TABLE public.retain_records
  ADD CONSTRAINT retain_records_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT retain_records_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_reset_auction(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  player_count integer;
  bid_count integer;
  result_count integer;
  event_count integer;
  retain_count integer;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Reset request id is required'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id=1 FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Auction state is not configured'; END IF;

  DELETE FROM public.bids; GET DIAGNOSTICS bid_count = ROW_COUNT;
  DELETE FROM public.auction_results; GET DIAGNOSTICS result_count = ROW_COUNT;
  DELETE FROM public.retain_records; GET DIAGNOSTICS retain_count = ROW_COUNT;
  DELETE FROM public.auction_events; GET DIAGNOSTICS event_count = ROW_COUNT;

  UPDATE public.players
  SET status='pool', sold_price=NULL, ambassador_id=NULL, sold_at=NULL, lot_number=NULL, updated_at=now()
  WHERE status <> 'pool' OR sold_price IS NOT NULL OR ambassador_id IS NOT NULL
     OR sold_at IS NOT NULL OR lot_number IS NOT NULL;
  GET DIAGNOSTICS player_count = ROW_COUNT;

  UPDATE public.ambassadors SET remaining_points=starting_points, updated_at=now();

  UPDATE public.auction_state
  SET status='not_started', current_player_id=NULL, current_bid=NULL, current_bidder_id=NULL,
      lot_counter=0, bidding_open=false, caster_cam_live=false, updated_at=now()
  WHERE id=1;

  RETURN jsonb_build_object(
    'ok',true,'request_id',p_request_id,'players_reset',player_count,
    'bids_deleted',bid_count,'results_deleted',result_count,
    'retains_deleted',retain_count,'events_deleted',event_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_auction(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_auction(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.snapshot_player_before_delete() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.snapshot_ambassador_before_delete() FROM PUBLIC,anon,authenticated;

NOTIFY pgrst,'reload schema';
