ALTER TYPE public.auction_status ADD VALUE IF NOT EXISTS 'stopped';
ALTER TYPE public.player_status ADD VALUE IF NOT EXISTS 'retained';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_ci ON public.profiles (lower(username));

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.ambassadors ALTER COLUMN starting_points SET DEFAULT 50000;
ALTER TABLE public.ambassadors ALTER COLUMN remaining_points SET DEFAULT 50000;

ALTER TABLE public.auction_state
  ADD COLUMN IF NOT EXISTS default_starting_points bigint NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS retain_price bigint NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_retains integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS caster_cam_live boolean NOT NULL DEFAULT false;
ALTER TABLE public.auction_state ALTER COLUMN base_price SET DEFAULT 1000;
ALTER TABLE public.auction_state ALTER COLUMN min_increment SET DEFAULT 500;
ALTER TABLE public.auction_state ALTER COLUMN max_ambassadors SET DEFAULT 24;

ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS bids_idem ON public.bids (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS bids_player ON public.bids (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS players_status ON public.players (status);
CREATE INDEX IF NOT EXISTS events_created ON public.auction_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.casters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  caster_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.casters TO anon, authenticated;
GRANT ALL ON public.casters TO service_role;
ALTER TABLE public.casters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "casters public read" ON public.casters FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.auction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES public.players(id),
  ambassador_id uuid REFERENCES public.ambassadors(id),
  winning_bid bigint,
  status text NOT NULL CHECK (status IN ('sold','retained','unsold')),
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auction_results TO anon, authenticated;
GRANT ALL ON public.auction_results TO service_role;
ALTER TABLE public.auction_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results public read" ON public.auction_results FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.retain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES public.players(id),
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id),
  retain_price bigint NOT NULL,
  is_locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.retain_records TO anon, authenticated;
GRANT ALL ON public.retain_records TO service_role;
ALTER TABLE public.retain_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retains public read" ON public.retain_records FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.block_history_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'History is immutable'; END; $$;
CREATE TRIGGER events_immutable BEFORE UPDATE OR DELETE ON public.auction_events FOR EACH ROW EXECUTE FUNCTION public.block_history_change();
CREATE TRIGGER results_immutable BEFORE UPDATE OR DELETE ON public.auction_results FOR EACH ROW EXECUTE FUNCTION public.block_history_change();
CREATE TRIGGER retains_immutable BEFORE UPDATE OR DELETE ON public.retain_records FOR EACH ROW EXECUTE FUNCTION public.block_history_change();

CREATE OR REPLACE FUNCTION public.protect_player_row() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.video_url IS NOT NULL AND NEW.video_url IS DISTINCT FROM OLD.video_url THEN
    RAISE EXCEPTION 'Video is locked and cannot be replaced';
  END IF;
  IF OLD.status::text IN ('sold','unsold','retained') AND current_setting('role', true) <> 'service_role' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.sold_price IS DISTINCT FROM OLD.sold_price
       OR NEW.ambassador_id IS DISTINCT FROM OLD.ambassador_id THEN
      RAISE EXCEPTION 'Auction result is locked';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.is_active_user(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT is_active FROM public.profiles WHERE id = _uid), false)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.has_role(_uid,'caster') OR public.has_role(_uid,'admin')) AND public.is_active_user(_uid)
$$;

CREATE OR REPLACE FUNCTION public.caster_set_status(p_status auction_status) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur text; nxt text := p_status::text; ev text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT status::text INTO cur FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF cur = 'not_started' AND nxt = 'live' THEN ev := 'AUCTION_STARTED';
  ELSIF cur = 'live' AND nxt = 'paused' THEN ev := 'AUCTION_PAUSED';
  ELSIF cur = 'paused' AND nxt = 'live' THEN ev := 'AUCTION_RESUMED';
  ELSIF cur IN ('live','paused') AND nxt = 'stopped' THEN ev := 'AUCTION_STOPPED';
  ELSE RAISE EXCEPTION 'Invalid status change';
  END IF;
  UPDATE public.auction_state SET status = p_status, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message) VALUES (ev, replace(initcap(replace(ev,'_',' ')),'Auction ','Auction '));
  RETURN jsonb_build_object('ok', true, 'status', nxt);
END; $$;

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
    UPDATE public.auction_state SET status = 'completed', updated_at = now() WHERE id = 1;
    INSERT INTO public.auction_events (event_type, message) VALUES ('AUCTION_COMPLETED','Auction completed — pool is empty');
    RETURN jsonb_build_object('ok', true, 'completed', true);
  END IF;
  UPDATE public.players SET status = 'in_auction', lot_number = st.lot_counter + 1 WHERE id = nxt.id;
  UPDATE public.auction_state SET current_player_id = nxt.id, current_bid = NULL, current_bidder_id = NULL,
    lot_counter = st.lot_counter + 1, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id) VALUES ('PLAYER_SELECTED', nxt.ingame_name || ' is on the block', nxt.id);
  RETURN jsonb_build_object('ok', true, 'player_id', nxt.id);
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
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player is no longer being auctioned'; END IF;
  IF NOT public.has_role(auth.uid(),'ambassador') OR NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only active ambassadors can bid';
  END IF;
  SELECT * INTO amb FROM public.ambassadors WHERE user_id = auth.uid() FOR UPDATE;
  IF amb.id IS NULL THEN RAISE EXCEPTION 'Only active ambassadors can bid'; END IF;
  min_needed := CASE WHEN st.current_bid IS NULL THEN st.base_price ELSE st.current_bid + st.min_increment END;
  IF p_amount < min_needed THEN RAISE EXCEPTION 'Bid must be at least %', min_needed; END IF;
  IF (p_amount - coalesce(st.current_bid, st.base_price)) % st.min_increment <> 0 AND st.current_bid IS NOT NULL THEN
    RAISE EXCEPTION 'Bid must go up in steps of %', st.min_increment;
  END IF;
  IF st.current_bidder_id = amb.id THEN RAISE EXCEPTION 'You are already the highest bidder'; END IF;
  IF p_amount > amb.remaining_points THEN RAISE EXCEPTION 'Not enough points'; END IF;
  INSERT INTO public.bids (player_id, ambassador_id, amount, idempotency_key) VALUES (st.current_player_id, amb.id, p_amount, p_idempotency_key);
  UPDATE public.auction_state SET current_bid = p_amount, current_bidder_id = amb.id, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('BID_PLACED', amb.team_name || ' bid ' || p_amount::text, st.current_player_id, amb.id, p_amount);
  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_player_v3() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players; amb public.ambassadors;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id FOR UPDATE;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player already finalized'; END IF;
  IF st.current_bid IS NULL OR st.current_bidder_id IS NULL THEN
    UPDATE public.players SET status = 'unsold' WHERE id = pl.id;
    INSERT INTO public.auction_results (player_id, status) VALUES (pl.id, 'unsold');
    INSERT INTO public.auction_events (event_type, message, player_id) VALUES ('PLAYER_UNSOLD', pl.ingame_name || ' went UNSOLD', pl.id);
    UPDATE public.auction_state SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, updated_at = now() WHERE id = 1;
    RETURN jsonb_build_object('ok', true, 'result', 'unsold');
  END IF;
  SELECT * INTO amb FROM public.ambassadors WHERE id = st.current_bidder_id FOR UPDATE;
  IF amb.remaining_points < st.current_bid THEN RAISE EXCEPTION 'Winning team has insufficient points'; END IF;
  UPDATE public.ambassadors SET remaining_points = remaining_points - st.current_bid, updated_at = now() WHERE id = amb.id;
  UPDATE public.players SET status = 'sold', sold_price = st.current_bid, ambassador_id = amb.id, sold_at = now() WHERE id = pl.id;
  INSERT INTO public.auction_results (player_id, ambassador_id, winning_bid, status) VALUES (pl.id, amb.id, st.current_bid, 'sold');
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('PLAYER_SOLD', pl.ingame_name || ' SOLD to ' || amb.team_name, pl.id, amb.id, st.current_bid);
  UPDATE public.auction_state SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'result', 'sold', 'amount', st.current_bid);
END; $$;

CREATE OR REPLACE FUNCTION public.retain_player_v3() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players; amb public.ambassadors; used int;
BEGIN
  IF NOT public.has_role(auth.uid(),'ambassador') OR NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only active ambassadors can retain';
  END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.status::text <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  IF st.current_bid IS NOT NULL THEN RAISE EXCEPTION 'Retain is only allowed before the first bid'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id FOR UPDATE;
  IF pl.status::text <> 'in_auction' THEN RAISE EXCEPTION 'Player already finalized'; END IF;
  SELECT * INTO amb FROM public.ambassadors WHERE user_id = auth.uid() FOR UPDATE;
  IF amb.id IS NULL THEN RAISE EXCEPTION 'Only active ambassadors can retain'; END IF;
  SELECT count(*) INTO used FROM public.retain_records WHERE ambassador_id = amb.id;
  IF used >= st.max_retains THEN RAISE EXCEPTION 'You have used all your retains'; END IF;
  IF amb.remaining_points < st.retain_price THEN RAISE EXCEPTION 'Not enough points'; END IF;
  UPDATE public.ambassadors SET remaining_points = remaining_points - st.retain_price, updated_at = now() WHERE id = amb.id;
  INSERT INTO public.retain_records (player_id, ambassador_id, retain_price) VALUES (pl.id, amb.id, st.retain_price);
  UPDATE public.players SET status = 'retained', sold_price = st.retain_price, ambassador_id = amb.id, sold_at = now() WHERE id = pl.id;
  INSERT INTO public.auction_results (player_id, ambassador_id, winning_bid, status) VALUES (pl.id, amb.id, st.retain_price, 'retained');
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('PLAYER_RETAINED', pl.ingame_name || ' RETAINED by ' || amb.team_name, pl.id, amb.id, st.retain_price);
  UPDATE public.auction_state SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'result', 'retained');
END; $$;

REVOKE EXECUTE ON FUNCTION public.place_bid(bigint) FROM authenticated, public;
REVOKE EXECUTE ON FUNCTION public.caster_end_bidding() FROM authenticated, public;
REVOKE EXECUTE ON FUNCTION public.place_bid_v3(bigint, text), public.finalize_player_v3(), public.retain_player_v3(),
  public.is_active_user(uuid), public.is_staff(uuid), public.block_history_change() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_bid_v3(bigint, text), public.finalize_player_v3(), public.retain_player_v3() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid), public.is_active_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "player reads videos" ON storage.objects;
CREATE POLICY "videos owner or staff read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'player-videos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

ALTER TABLE public.auction_results REPLICA IDENTITY FULL;
ALTER TABLE public.retain_records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_results, public.retain_records;