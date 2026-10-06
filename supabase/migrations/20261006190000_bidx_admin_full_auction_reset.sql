-- BIDXAUCTION: admin-only full auction reset
-- Resets the current auction to a brand-new state and intentionally removes
-- auction history (bids/results/events/retains). Player and ambassador accounts
-- are preserved.

CREATE OR REPLACE FUNCTION public.admin_reset_auction()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  st public.auction_state;
  player_count integer;
  bid_count integer;
  result_count integer;
  event_count integer;
  retain_count integer;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Auction state is not configured'; END IF;

  DELETE FROM public.bids;
  GET DIAGNOSTICS bid_count = ROW_COUNT;

  DELETE FROM public.auction_results;
  GET DIAGNOSTICS result_count = ROW_COUNT;

  DELETE FROM public.retain_records;
  GET DIAGNOSTICS retain_count = ROW_COUNT;

  DELETE FROM public.auction_events;
  GET DIAGNOSTICS event_count = ROW_COUNT;

  UPDATE public.players
  SET status = 'pool',
      sold_price = NULL,
      ambassador_id = NULL,
      sold_at = NULL,
      lot_number = NULL,
      sold_ambassador_name_snapshot = NULL,
      sold_team_name_snapshot = NULL,
      updated_at = now()
  WHERE status <> 'pool'
     OR sold_price IS NOT NULL
     OR ambassador_id IS NOT NULL
     OR sold_at IS NOT NULL
     OR lot_number IS NOT NULL
     OR sold_ambassador_name_snapshot IS NOT NULL
     OR sold_team_name_snapshot IS NOT NULL;
  GET DIAGNOSTICS player_count = ROW_COUNT;

  UPDATE public.ambassadors
  SET remaining_points = starting_points, updated_at = now();

  UPDATE public.auction_state
  SET status = 'not_started',
      current_player_id = NULL,
      current_bid = NULL,
      current_bidder_id = NULL,
      lot_counter = 0,
      bidding_open = false,
      caster_cam_live = false,
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'ok', true,
    'players_reset', player_count,
    'bids_deleted', bid_count,
    'results_deleted', result_count,
    'retains_deleted', retain_count,
    'events_deleted', event_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_reset_auction() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reset_auction() FROM anon;
REVOKE ALL ON FUNCTION public.admin_reset_auction() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_auction() TO service_role;

NOTIFY pgrst, 'reload schema';
