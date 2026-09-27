
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','caster','ambassador','player');
CREATE TYPE public.player_status AS ENUM ('pool','in_auction','sold','unsold');
CREATE TYPE public.auction_status AS ENUM ('not_started','live','paused','completed');
CREATE TYPE public.game_role AS ENUM ('primary_rusher','secondary_rusher','sniper','nader','supporter');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- AMBASSADORS
CREATE TABLE public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ambassador_name text NOT NULL,
  team_name text NOT NULL UNIQUE,
  photo_url text,
  info text,
  discord text,
  starting_points bigint NOT NULL DEFAULT 0,
  remaining_points bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.ambassadors TO authenticated;
GRANT SELECT ON public.ambassadors TO anon;
GRANT ALL ON public.ambassadors TO service_role;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- PLAYERS
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  ingame_name text NOT NULL,
  game_id text NOT NULL UNIQUE,
  photo_url text,
  video_url text,
  primary_role public.game_role NOT NULL,
  secondary_role public.game_role,
  info text,
  status public.player_status NOT NULL DEFAULT 'pool',
  sold_price bigint,
  ambassador_id uuid REFERENCES public.ambassadors(id) ON DELETE SET NULL,
  sold_at timestamptz,
  lot_number int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.players TO authenticated;
GRANT SELECT ON public.players TO anon;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- AUCTION STATE (single row)
CREATE TABLE public.auction_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status public.auction_status NOT NULL DEFAULT 'not_started',
  current_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  current_bid bigint,
  current_bidder_id uuid REFERENCES public.ambassadors(id) ON DELETE SET NULL,
  base_price bigint NOT NULL DEFAULT 100000,
  min_increment bigint NOT NULL DEFAULT 50000,
  lot_counter int NOT NULL DEFAULT 0,
  max_players int NOT NULL DEFAULT 50,
  max_ambassadors int NOT NULL DEFAULT 10,
  max_casters int NOT NULL DEFAULT 2,
  caster_stream_url text,
  tournament_name text NOT NULL DEFAULT 'PRO LEAGUE',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.auction_state (id) VALUES (1);
GRANT SELECT ON public.auction_state TO authenticated, anon;
GRANT ALL ON public.auction_state TO service_role;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;

-- BIDS
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  ambassador_id uuid NOT NULL REFERENCES public.ambassadors(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bids TO authenticated, anon;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- AUCTION EVENTS (live feed / audit)
CREATE TABLE public.auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  message text NOT NULL,
  player_id uuid,
  ambassador_id uuid,
  amount bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auction_events TO authenticated, anon;
GRANT ALL ON public.auction_events TO service_role;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "ambassadors public read" ON public.ambassadors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ambassadors self profile update" ON public.ambassadors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "players public read" ON public.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "players self insert" ON public.players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "players self update limited" ON public.players FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pool') WITH CHECK (user_id = auth.uid());

CREATE POLICY "auction state public read" ON public.auction_state FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "bids public read" ON public.bids FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events public read" ON public.auction_events FOR SELECT TO anon, authenticated USING (true);

-- LOCK SOLD RESULTS AND ONE-TIME VIDEO
CREATE OR REPLACE FUNCTION public.protect_player_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.video_url IS NOT NULL AND NEW.video_url IS DISTINCT FROM OLD.video_url THEN
    RAISE EXCEPTION 'Video is locked and cannot be replaced';
  END IF;
  IF OLD.status IN ('sold','unsold') AND current_setting('role', true) <> 'service_role' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.sold_price IS DISTINCT FROM OLD.sold_price
       OR NEW.ambassador_id IS DISTINCT FROM OLD.ambassador_id THEN
      RAISE EXCEPTION 'Auction result is locked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER players_protect BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.protect_player_row();

-- ACCOUNT LIMIT ENFORCEMENT
CREATE OR REPLACE FUNCTION public.enforce_player_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; cnt int;
BEGIN
  SELECT max_players INTO lim FROM public.auction_state WHERE id = 1 FOR UPDATE;
  SELECT count(*) INTO cnt FROM public.players;
  IF cnt >= lim THEN
    RAISE EXCEPTION 'Player registration is full';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER players_limit BEFORE INSERT ON public.players
FOR EACH ROW EXECUTE FUNCTION public.enforce_player_limit();

-- AUCTION ENGINE
CREATE OR REPLACE FUNCTION public.place_bid(p_amount bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; amb public.ambassadors; min_needed bigint;
BEGIN
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.status <> 'live' THEN RAISE EXCEPTION 'Auction is not live'; END IF;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;

  SELECT * INTO amb FROM public.ambassadors WHERE user_id = auth.uid() FOR UPDATE;
  IF amb.id IS NULL THEN RAISE EXCEPTION 'Only ambassadors can bid'; END IF;
  IF NOT public.has_role(auth.uid(),'ambassador') THEN RAISE EXCEPTION 'Only ambassadors can bid'; END IF;

  IF st.current_bid IS NULL THEN min_needed := st.base_price;
  ELSE min_needed := st.current_bid + st.min_increment; END IF;

  IF p_amount < min_needed THEN
    RAISE EXCEPTION 'Bid must be at least %', min_needed;
  END IF;
  IF st.current_bidder_id = amb.id THEN
    RAISE EXCEPTION 'You are already the highest bidder';
  END IF;
  IF p_amount > amb.remaining_points THEN
    RAISE EXCEPTION 'Not enough points';
  END IF;

  INSERT INTO public.bids (player_id, ambassador_id, amount)
  VALUES (st.current_player_id, amb.id, p_amount);

  UPDATE public.auction_state
    SET current_bid = p_amount, current_bidder_id = amb.id, updated_at = now()
    WHERE id = 1;

  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('BID_PLACED', amb.team_name || ' bid ' || p_amount::text, st.current_player_id, amb.id, p_amount);

  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.caster_set_status(p_status public.auction_status)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'caster') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.auction_state SET status = p_status, updated_at = now() WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message)
  VALUES ('AUCTION_' || upper(p_status::text), 'Auction ' || p_status::text);
  RETURN jsonb_build_object('ok', true, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.caster_next_player()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; nxt public.players;
BEGIN
  IF NOT (public.has_role(auth.uid(),'caster') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.current_player_id IS NOT NULL THEN
    RAISE EXCEPTION 'Finish the current player first';
  END IF;

  SELECT * INTO nxt FROM public.players WHERE status = 'pool' ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF nxt.id IS NULL THEN
    UPDATE public.auction_state SET status = 'completed', updated_at = now() WHERE id = 1;
    INSERT INTO public.auction_events (event_type, message) VALUES ('AUCTION_COMPLETED','Auction completed');
    RETURN jsonb_build_object('ok', true, 'completed', true);
  END IF;

  UPDATE public.players SET status = 'in_auction', lot_number = st.lot_counter + 1 WHERE id = nxt.id;
  UPDATE public.auction_state
    SET current_player_id = nxt.id, current_bid = NULL, current_bidder_id = NULL,
        lot_counter = st.lot_counter + 1, status = 'live', updated_at = now()
    WHERE id = 1;
  INSERT INTO public.auction_events (event_type, message, player_id)
  VALUES ('NEXT_PLAYER', nxt.ingame_name || ' is on the block', nxt.id);
  RETURN jsonb_build_object('ok', true, 'player_id', nxt.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.caster_end_bidding()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.auction_state; pl public.players; amb public.ambassadors;
BEGIN
  IF NOT (public.has_role(auth.uid(),'caster') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO st FROM public.auction_state WHERE id = 1 FOR UPDATE;
  IF st.current_player_id IS NULL THEN RAISE EXCEPTION 'No player on the block'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = st.current_player_id FOR UPDATE;
  IF pl.status <> 'in_auction' THEN RAISE EXCEPTION 'Player already finalized'; END IF;

  IF st.current_bid IS NULL OR st.current_bidder_id IS NULL THEN
    UPDATE public.players SET status = 'unsold' WHERE id = pl.id;
    INSERT INTO public.auction_events (event_type, message, player_id)
    VALUES ('PLAYER_UNSOLD', pl.ingame_name || ' went UNSOLD', pl.id);
    UPDATE public.auction_state
      SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, updated_at = now()
      WHERE id = 1;
    RETURN jsonb_build_object('ok', true, 'result','unsold');
  END IF;

  SELECT * INTO amb FROM public.ambassadors WHERE id = st.current_bidder_id FOR UPDATE;
  IF amb.remaining_points < st.current_bid THEN RAISE EXCEPTION 'Winning ambassador has insufficient points'; END IF;

  UPDATE public.ambassadors SET remaining_points = remaining_points - st.current_bid WHERE id = amb.id;
  UPDATE public.players
    SET status = 'sold', sold_price = st.current_bid, ambassador_id = amb.id, sold_at = now()
    WHERE id = pl.id;
  INSERT INTO public.auction_events (event_type, message, player_id, ambassador_id, amount)
  VALUES ('PLAYER_SOLD', pl.ingame_name || ' SOLD to ' || amb.team_name, pl.id, amb.id, st.current_bid);
  UPDATE public.auction_state
    SET current_player_id = NULL, current_bid = NULL, current_bidder_id = NULL, updated_at = now()
    WHERE id = 1;
  RETURN jsonb_build_object('ok', true, 'result','sold', 'amount', st.current_bid);
END;
$$;

REVOKE ALL ON FUNCTION public.place_bid(bigint) FROM public;
REVOKE ALL ON FUNCTION public.caster_set_status(public.auction_status) FROM public;
REVOKE ALL ON FUNCTION public.caster_next_player() FROM public;
REVOKE ALL ON FUNCTION public.caster_end_bidding() FROM public;
GRANT EXECUTE ON FUNCTION public.place_bid(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_set_status(public.auction_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_next_player() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_end_bidding() TO authenticated;

-- REALTIME
ALTER TABLE public.auction_state REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.ambassadors REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassadors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_events;
