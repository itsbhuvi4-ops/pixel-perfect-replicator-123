CREATE OR REPLACE FUNCTION public.block_history_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin full reset: only inside admin_reset_auction, which sets this flag
  -- transaction-locally and itself requires the service role.
  IF TG_OP = 'DELETE'
     AND current_setting('bidx.auction_reset', true) = 'on'
     AND current_setting('role', true) = 'service_role'
  THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND current_setting('bidx.account_delete', true) = 'on'
     AND (
       (OLD.player_id IS NOT NULL AND NEW.player_id IS NULL)
       OR (OLD.ambassador_id IS NOT NULL AND NEW.ambassador_id IS NULL)
     )
     AND (NEW.player_id IS NULL OR NEW.player_id IS NOT DISTINCT FROM OLD.player_id)
     AND (NEW.ambassador_id IS NULL OR NEW.ambassador_id IS NOT DISTINCT FROM OLD.ambassador_id)
     AND (to_jsonb(OLD) - 'player_id' - 'ambassador_id')
         = (to_jsonb(NEW) - 'player_id' - 'ambassador_id')
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'History is immutable';
END;
$$;

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
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Reset request id is required';
  END IF;

  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.id IS NULL THEN
    RAISE EXCEPTION 'Auction state is not configured';
  END IF;

  -- Clear live pointers first so FK references to players/ambassadors are released.
  UPDATE public.auction_state
  SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL
  WHERE id = 1;

  PERFORM set_config('bidx.auction_reset', 'on', true);

  -- Explicit key predicates: the database rejects unqualified DELETEs.
  DELETE FROM public.bids WHERE id IS NOT NULL;
  GET DIAGNOSTICS bid_count = ROW_COUNT;
  DELETE FROM public.auction_results WHERE id IS NOT NULL;
  GET DIAGNOSTICS result_count = ROW_COUNT;
  DELETE FROM public.retain_records WHERE id IS NOT NULL;
  GET DIAGNOSTICS retain_count = ROW_COUNT;
  DELETE FROM public.auction_events WHERE id IS NOT NULL;
  GET DIAGNOSTICS event_count = ROW_COUNT;

  PERFORM set_config('bidx.auction_reset', 'off', true);

  UPDATE public.players
  SET status = 'pool', sold_price = NULL, ambassador_id = NULL, sold_at = NULL,
      lot_number = NULL, updated_at = now()
  WHERE status <> 'pool' OR sold_price IS NOT NULL OR ambassador_id IS NOT NULL
     OR sold_at IS NOT NULL OR lot_number IS NOT NULL;
  GET DIAGNOSTICS player_count = ROW_COUNT;

  UPDATE public.ambassadors
  SET remaining_points = starting_points, updated_at = now()
  WHERE id IS NOT NULL;

  UPDATE public.auction_state
  SET status = 'not_started', current_player_id = NULL, current_bid = NULL,
      current_bidder_id = NULL, lot_counter = 0, bidding_open = false,
      caster_cam_live = false, updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'ok', true, 'request_id', p_request_id,
    'players_reset', player_count, 'bids_deleted', bid_count,
    'results_deleted', result_count, 'retains_deleted', retain_count,
    'events_deleted', event_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_auction(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_auction(uuid) TO service_role;