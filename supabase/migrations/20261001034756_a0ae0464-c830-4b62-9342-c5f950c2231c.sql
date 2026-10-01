ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS team_name text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.auction_state ADD COLUMN IF NOT EXISTS bidding_open boolean NOT NULL DEFAULT false;

-- Private player contact details (never public)
CREATE TABLE IF NOT EXISTS public.player_contacts (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.player_contacts TO authenticated;
GRANT ALL ON public.player_contacts TO service_role;
ALTER TABLE public.player_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts owner or admin read" ON public.player_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own mark read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS notifications_user_time ON public.notifications (user_id, created_at DESC);
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_from_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ttl text; prev_user uuid;
BEGIN
  ttl := CASE NEW.event_type
    WHEN 'PLAYER_SELECTED' THEN 'Player revealed'
    WHEN 'BIDDING_OPEN' THEN 'Bidding open'
    WHEN 'BID_PLACED' THEN 'New higher bid'
    WHEN 'AUCTION_PAUSED' THEN 'Auction paused'
    WHEN 'AUCTION_RESUMED' THEN 'Auction resumed'
    WHEN 'PLAYER_SOLD' THEN 'Player SOLD'
    WHEN 'PLAYER_UNSOLD' THEN 'Player UNSOLD'
    WHEN 'AUCTION_STOPPED' THEN 'Auction ended'
    WHEN 'AUCTION_COMPLETED' THEN 'Auction ended'
    WHEN 'AUCTION_STARTED' THEN 'Auction started'
    ELSE NULL END;
  IF ttl IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT a.user_id, NEW.event_type, ttl, NEW.message FROM public.ambassadors a
  WHERE NEW.event_type <> 'BID_PLACED' OR a.id IS DISTINCT FROM NEW.ambassador_id;
  IF NEW.event_type = 'BID_PLACED' THEN
    SELECT a.user_id INTO prev_user FROM public.bids b JOIN public.ambassadors a ON a.id = b.ambassador_id
    WHERE b.player_id = NEW.player_id AND b.ambassador_id <> NEW.ambassador_id
    ORDER BY b.created_at DESC OFFSET 0 LIMIT 1;
    IF prev_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (prev_user, 'OUTBID', 'You were outbid', NEW.message);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS events_notify ON public.auction_events;
CREATE TRIGGER events_notify AFTER INSERT ON public.auction_events FOR EACH ROW EXECUTE FUNCTION public.notify_from_event();

-- Reveal a random player (bidding stays closed until caster opens it)
CREATE OR REPLACE FUNCTION public.caster_next_player() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; nxt public.players;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.status::text <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF st.current_player_id IS NOT NULL THEN RAISE EXCEPTION 'Finish the current player first'; END IF;
  SELECT * INTO nxt FROM public.players WHERE status = 'pool' ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF nxt.id IS NULL THEN
    UPDATE public.auction_state SET status = 'completed', bidding_open = false, updated_at = now() WHERE id = 1;
    INSERT INTO public.auction_events (event_type, message) VALUES ('AUCTION_COMPLETED','Auction completed — pool is empty');
    RETURN jsonb_build_object('ok', true, 'completed', true);
  END IF;
  UPDATE public.players SET status = 'in_auction', lot_number = st.lot_counter + 1 WHERE id = nxt.id;
  UPDATE public.auction_state SET current_player_id = nxt.id, current_bid = NULL, current_bidder_id = NULL,
    bidding_open = false, lot_counter = st.lot_counter + 1, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id) VALUES ('PLAYER_SELECTED', nxt.ingame_name || ' revealed', nxt.id);
  RETURN jsonb_build_object('ok', true, 'player_id', nxt.id);
END; $$;

CREATE OR REPLACE FUNCTION public.caster_open_bidding() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.status::text <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'Reveal a player first'; END IF;
  IF st.bidding_open THEN RAISE EXCEPTION 'Bidding is already open'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id;
  UPDATE public.auction_state SET bidding_open = true, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id) VALUES ('BIDDING_OPEN', 'Bidding open for ' || pl.ingame_name, pl.id);
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.place_bid_v3(p_amount bigint, p_idempotency_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; amb public.ambassadors; pl public.players; min_needed bigint;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 OR length(p_idempotency_key) > 100 THEN
    RAISE EXCEPTION 'Invalid request key';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bids WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.status::text = 'paused' THEN RAISE EXCEPTION 'Auction is currently paused'; END IF;
  IF st.status::text <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  IF NOT st.bidding_open THEN RAISE EXCEPTION 'Bidding is not open yet'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player is no longer being auctioned'; END IF;
  IF NOT public.has_role(auth.uid(),'ambassador') OR NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only active ambassadors can bid';
  END IF;
  SELECT * INTO amb FROM public.ambassadors WHERE user_id = auth.uid() FOR UPDATE;
  IF amb.id IS NULL THEN RAISE EXCEPTION 'Only active ambassadors can bid'; END IF;
  min_needed := CASE WHEN st.current_bid IS NULL THEN st.base_price ELSE st.current_bid + st.min_increment END;
  IF p_amount < min_needed THEN RAISE EXCEPTION 'Bid must be at least %', min_needed; END IF;
  IF st.current_bidder_id = amb.id THEN RAISE EXCEPTION 'You are already the highest bidder'; END IF;
  IF p_amount > amb.remaining_points THEN RAISE EXCEPTION 'Not enough points'; END IF;
  INSERT INTO public.bids (player_id, ambassador_id, amount, idempotency_key) VALUES (st.current_player_id, amb.id, p_amount, p_idempotency_key);
  UPDATE public.auction_state SET current_bid = p_amount, current_bidder_id = amb.id, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('BID_PLACED', amb.team_name || ' bid ' || p_amount::text, st.current_player_id, amb.id, p_amount);
  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END; $$;

-- SOLD (requires a highest bid)
CREATE OR REPLACE FUNCTION public.finalize_player_v3() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players; amb public.ambassadors;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id FOR UPDATE;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player already finalized'; END IF;
  IF st.current_bid IS NULL OR st.current_bidder_id IS NULL THEN RAISE EXCEPTION 'No bids yet — use UNSOLD'; END IF;
  SELECT * INTO amb FROM public.ambassadors WHERE id = st.current_bidder_id FOR UPDATE;
  IF amb.remaining_points < st.current_bid THEN RAISE EXCEPTION 'Winning team has insufficient points'; END IF;
  UPDATE public.ambassadors SET remaining_points = remaining_points - st.current_bid, updated_at = now() WHERE id = amb.id;
  UPDATE public.players SET status = 'sold', sold_price = st.current_bid, ambassador_id = amb.id, sold_at = now() WHERE id = pl.id;
  INSERT INTO public.auction_results (player_id, ambassador_id, winning_bid, status) VALUES (pl.id, amb.id, st.current_bid, 'sold');
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('PLAYER_SOLD', pl.ingame_name || ' SOLD to ' || amb.team_name, pl.id, amb.id, st.current_bid);
  UPDATE public.auction_state SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, bidding_open = false, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'result', 'sold', 'amount', st.current_bid);
END; $$;

CREATE OR REPLACE FUNCTION public.caster_mark_unsold() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id FOR UPDATE;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player already finalized'; END IF;
  UPDATE public.players SET status = 'unsold' WHERE id = pl.id;
  INSERT INTO public.auction_results (player_id, status) VALUES (pl.id, 'unsold');
  INSERT INTO public.auction_events (event_type, message, player_id) VALUES ('PLAYER_UNSOLD', pl.ingame_name || ' went UNSOLD', pl.id);
  UPDATE public.auction_state SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, bidding_open = false, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'result', 'unsold');
END; $$;

CREATE OR REPLACE FUNCTION public.caster_set_status(p_status auction_status) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text; nxt text := p_status::text; ev text; msg text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT status::text INTO cur FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF cur = 'not_started' AND nxt = 'live' THEN ev := 'AUCTION_STARTED'; msg := 'Auction started';
  ELSIF cur = 'live' AND nxt = 'paused' THEN ev := 'AUCTION_PAUSED'; msg := 'Auction paused';
  ELSIF cur = 'paused' AND nxt = 'live' THEN ev := 'AUCTION_RESUMED'; msg := 'Auction resumed';
  ELSIF cur IN ('live','paused') AND nxt = 'stopped' THEN ev := 'AUCTION_STOPPED'; msg := 'Auction ended';
  ELSE RAISE EXCEPTION 'Invalid status change';
  END IF;
  IF nxt = 'stopped' AND EXISTS (SELECT 1 FROM public.auction_state WHERE id = 1 AND current_player_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Mark the current player SOLD or UNSOLD first';
  END IF;
  UPDATE public.auction_state SET status = p_status, bidding_open = CASE WHEN nxt = 'stopped' THEN false ELSE bidding_open END, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message) VALUES (ev, msg);
  RETURN jsonb_build_object('ok', true, 'status', nxt);
END; $$;

-- Retain is not part of BidX: disable it (history kept)
REVOKE EXECUTE ON FUNCTION public.retain_player_v3() FROM authenticated, anon, public;

REVOKE EXECUTE ON FUNCTION public.caster_open_bidding(), public.caster_mark_unsold(), public.notify_from_event() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.caster_open_bidding(), public.caster_mark_unsold() TO authenticated;