-- BIDXAUCTION: repair admin RPC contracts used by the server.
-- Explicit request IDs avoid zero-argument PostgREST schema-cache resolution.

DROP FUNCTION IF EXISTS public.admin_reset_auction();

CREATE OR REPLACE FUNCTION public.admin_reset_auction(p_request_id uuid)
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
  IF current_setting('role', true) <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Reset request id is required'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Auction state is not configured'; END IF;
  DELETE FROM public.bids; GET DIAGNOSTICS bid_count = ROW_COUNT;
  DELETE FROM public.auction_results; GET DIAGNOSTICS result_count = ROW_COUNT;
  DELETE FROM public.retain_records; GET DIAGNOSTICS retain_count = ROW_COUNT;
  DELETE FROM public.auction_events; GET DIAGNOSTICS event_count = ROW_COUNT;
  UPDATE public.players
  SET status='pool', sold_price=NULL, ambassador_id=NULL, sold_at=NULL, lot_number=NULL,
      sold_ambassador_name_snapshot=NULL, sold_team_name_snapshot=NULL, updated_at=now()
  WHERE status <> 'pool' OR sold_price IS NOT NULL OR ambassador_id IS NOT NULL OR sold_at IS NOT NULL
     OR lot_number IS NOT NULL OR sold_ambassador_name_snapshot IS NOT NULL OR sold_team_name_snapshot IS NOT NULL;
  GET DIAGNOSTICS player_count = ROW_COUNT;
  UPDATE public.ambassadors SET remaining_points=starting_points, updated_at=now();
  UPDATE public.auction_state
  SET status='not_started', current_player_id=NULL, current_bid=NULL, current_bidder_id=NULL,
      lot_counter=0, bidding_open=false, caster_cam_live=false, updated_at=now()
  WHERE id=1;
  RETURN jsonb_build_object('ok',true,'request_id',p_request_id,'players_reset',player_count,
    'bids_deleted',bid_count,'results_deleted',result_count,'retains_deleted',retain_count,'events_deleted',event_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_reset_auction(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_auction(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.admin_select_next_player_after_delete();

CREATE OR REPLACE FUNCTION public.admin_select_next_player_after_delete(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  st public.auction_state;
  nxt public.players;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Delete request id is required'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id=1 FOR UPDATE;
  IF st.status::text <> 'live' OR st.current_player_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok',true,'advanced',false,'request_id',p_request_id);
  END IF;
  SELECT * INTO nxt FROM public.players WHERE status='pool' ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF nxt.id IS NULL THEN
    UPDATE public.auction_state SET status='completed',bidding_open=false,updated_at=now() WHERE id=1;
    INSERT INTO public.auction_events(event_type,message) VALUES('AUCTION_COMPLETED','Auction completed — no eligible players remain');
    RETURN jsonb_build_object('ok',true,'advanced',false,'completed',true,'request_id',p_request_id);
  END IF;
  UPDATE public.players SET status='in_auction',lot_number=st.lot_counter+1,updated_at=now() WHERE id=nxt.id;
  UPDATE public.auction_state
  SET current_player_id=nxt.id,current_bid=NULL,current_bidder_id=NULL,bidding_open=false,
      lot_counter=st.lot_counter+1,updated_at=now() WHERE id=1;
  INSERT INTO public.auction_events(event_type,message,player_id) VALUES('PLAYER_SELECTED',nxt.ingame_name || ' revealed',nxt.id);
  RETURN jsonb_build_object('ok',true,'advanced',true,'completed',false,'player_id',nxt.id,
    'lot_number',st.lot_counter+1,'request_id',p_request_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_select_next_player_after_delete(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_select_next_player_after_delete(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';