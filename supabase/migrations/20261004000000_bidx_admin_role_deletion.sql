-- BidX Auction: keep the automatic auction moving when Admin deletes the current player.
CREATE OR REPLACE FUNCTION public.admin_select_next_player_after_delete()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  nxt public.players;
BEGIN
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;

  IF st.status::text <> 'live' OR st.current_player_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'advanced', false);
  END IF;

  SELECT * INTO nxt
  FROM public.players
  WHERE status = 'pool'
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF nxt.id IS NULL THEN
    UPDATE public.auction_state
    SET status = 'completed',
        bidding_open = false,
        updated_at = now()
    WHERE id = 1;

    INSERT INTO public.auction_events (event_type, message)
    VALUES ('AUCTION_COMPLETED', 'Auction completed — no eligible players remain');

    RETURN jsonb_build_object('ok', true, 'advanced', false, 'completed', true);
  END IF;

  UPDATE public.players
  SET status = 'in_auction',
      lot_number = st.lot_counter + 1,
      updated_at = now()
  WHERE id = nxt.id;

  UPDATE public.auction_state
  SET current_player_id = nxt.id,
      current_bid = NULL,
      current_bidder_id = NULL,
      bidding_open = false,
      lot_counter = st.lot_counter + 1,
      updated_at = now()
  WHERE id = 1;

  INSERT INTO public.auction_events (event_type, message, player_id)
  VALUES ('PLAYER_SELECTED', nxt.ingame_name || ' revealed', nxt.id);

  RETURN jsonb_build_object(
    'ok', true,
    'advanced', true,
    'completed', false,
    'player_id', nxt.id,
    'lot_number', st.lot_counter + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_select_next_player_after_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_select_next_player_after_delete() TO service_role;
