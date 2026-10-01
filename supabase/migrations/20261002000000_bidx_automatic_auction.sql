-- BidX Auction: server-owned automatic lot progression.
-- No player is ever selected by the frontend. Start/finalize operations lock
-- auction_state and choose the next eligible player in the same transaction.

CREATE OR REPLACE FUNCTION public.bidx_select_next_player_locked()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  nxt public.players;
BEGIN
  SELECT * INTO st
  FROM public.auction_state
  WHERE id = 1
  FOR UPDATE;

  IF st.current_player_id IS NOT NULL THEN
    RAISE EXCEPTION 'A player is already on the block';
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

    RETURN jsonb_build_object('ok', true, 'completed', true);
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
    'completed', false,
    'player_id', nxt.id,
    'lot_number', st.lot_counter + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bidx_select_next_player_locked() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.caster_set_status(p_status public.auction_status)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur text;
  nxt text := p_status::text;
  ev text;
  selected jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status::text INTO cur
  FROM public.auction_state
  WHERE id = 1
  FOR UPDATE;

  IF cur = 'not_started' AND nxt = 'live' THEN
    ev := 'AUCTION_STARTED';
  ELSIF cur = 'live' AND nxt = 'paused' THEN
    ev := 'AUCTION_PAUSED';
  ELSIF cur = 'paused' AND nxt = 'live' THEN
    ev := 'AUCTION_RESUMED';
  ELSIF cur IN ('live','paused') AND nxt = 'stopped' THEN
    ev := 'AUCTION_STOPPED';
  ELSE
    RAISE EXCEPTION 'Invalid status change';
  END IF;

  IF nxt = 'stopped' AND EXISTS (
    SELECT 1 FROM public.auction_state
    WHERE id = 1 AND current_player_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Finish the current player before ending the auction';
  END IF;

  UPDATE public.auction_state
  SET status = p_status,
      bidding_open = CASE WHEN nxt = 'stopped' THEN false ELSE bidding_open END,
      updated_at = now()
  WHERE id = 1;

  INSERT INTO public.auction_events (event_type, message)
  VALUES (ev, replace(initcap(replace(ev, '_', ' ')), 'Auction ', 'Auction '));

  -- Starting an auction atomically reveals the first random eligible player.
  IF nxt = 'live' AND cur = 'not_started' THEN
    SELECT public.bidx_select_next_player_locked() INTO selected;
    RETURN jsonb_build_object(
      'ok', true,
      'status', nxt,
      'started', true,
      'selection', selected
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', nxt);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_player_v3()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  pl public.players;
  amb public.ambassadors;
  selected jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO st
  FROM public.auction_state
  WHERE id = 1
  FOR UPDATE;

  IF st.status::text <> 'live' THEN
    RAISE EXCEPTION 'Auction is not live';
  END IF;

  IF st.current_player_id IS NULL THEN
    RAISE EXCEPTION 'No player on the block';
  END IF;

  SELECT * INTO pl
  FROM public.players
  WHERE id = st.current_player_id
  FOR UPDATE;

  IF pl.status::text <> 'in_auction' THEN
    RAISE EXCEPTION 'Player already finalized';
  END IF;

  IF st.current_bid IS NULL OR st.current_bidder_id IS NULL THEN
    UPDATE public.players
    SET status = 'unsold',
        updated_at = now()
    WHERE id = pl.id;

    INSERT INTO public.auction_results (player_id, status)
    VALUES (pl.id, 'unsold');

    INSERT INTO public.auction_events (event_type, message, player_id)
    VALUES ('PLAYER_UNSOLD', pl.ingame_name || ' went UNSOLD', pl.id);

    UPDATE public.auction_state
    SET current_player_id = NULL,
        current_bid = NULL,
        current_bidder_id = NULL,
        bidding_open = false,
        updated_at = now()
    WHERE id = 1;

    selected := public.bidx_select_next_player_locked();

    RETURN jsonb_build_object(
      'ok', true,
      'result', 'unsold',
      'next', selected
    );
  END IF;

  SELECT * INTO amb
  FROM public.ambassadors
  WHERE id = st.current_bidder_id
  FOR UPDATE;

  IF amb.id IS NULL THEN
    RAISE EXCEPTION 'Winning team not found';
  END IF;

  IF amb.remaining_points < st.current_bid THEN
    RAISE EXCEPTION 'Winning team has insufficient points';
  END IF;

  UPDATE public.ambassadors
  SET remaining_points = remaining_points - st.current_bid,
      updated_at = now()
  WHERE id = amb.id;

  UPDATE public.players
  SET status = 'sold',
      sold_price = st.current_bid,
      ambassador_id = amb.id,
      sold_at = now(),
      updated_at = now()
  WHERE id = pl.id;

  INSERT INTO public.auction_results (
    player_id, ambassador_id, winning_bid, status
  )
  VALUES (
    pl.id, amb.id, st.current_bid, 'sold'
  );

  INSERT INTO public.auction_events (
    event_type, message, player_id, ambassador_id, amount
  )
  VALUES (
    'PLAYER_SOLD',
    pl.ingame_name || ' SOLD to ' || amb.team_name,
    pl.id,
    amb.id,
    st.current_bid
  );

  UPDATE public.auction_state
  SET current_player_id = NULL,
      current_bid = NULL,
      current_bidder_id = NULL,
      bidding_open = false,
      updated_at = now()
  WHERE id = 1;

  selected := public.bidx_select_next_player_locked();

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'sold',
    'amount', st.current_bid,
    'next', selected
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.caster_mark_unsold()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st public.auction_state;
  pl public.players;
  selected jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO st
  FROM public.auction_state
  WHERE id = 1
  FOR UPDATE;

  IF st.status::text <> 'live' THEN
    RAISE EXCEPTION 'Auction is not live';
  END IF;

  IF st.current_player_id IS NULL THEN
    RAISE EXCEPTION 'No player on the block';
  END IF;

  SELECT * INTO pl
  FROM public.players
  WHERE id = st.current_player_id
  FOR UPDATE;

  IF pl.status::text <> 'in_auction' THEN
    RAISE EXCEPTION 'Player already finalized';
  END IF;

  IF st.current_bid IS NOT NULL THEN
    RAISE EXCEPTION 'A bid exists — finalize the highest bidder instead';
  END IF;

  UPDATE public.players
  SET status = 'unsold',
      updated_at = now()
  WHERE id = pl.id;

  INSERT INTO public.auction_results (player_id, status)
  VALUES (pl.id, 'unsold');

  INSERT INTO public.auction_events (event_type, message, player_id)
  VALUES ('PLAYER_UNSOLD', pl.ingame_name || ' went UNSOLD', pl.id);

  UPDATE public.auction_state
  SET current_player_id = NULL,
      current_bid = NULL,
      current_bidder_id = NULL,
      bidding_open = false,
      updated_at = now()
  WHERE id = 1;

  selected := public.bidx_select_next_player_locked();

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'unsold',
    'next', selected
  );
END;
$$;

-- The old RPC remains only as a compatibility symbol; clients must not use it
-- to manually advance the auction.
CREATE OR REPLACE FUNCTION public.caster_next_player()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Next player is selected automatically by the auction server';
END;
$$;

REVOKE ALL ON FUNCTION public.caster_next_player() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_player_v3() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_mark_unsold() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_set_status(public.auction_status) TO authenticated;
