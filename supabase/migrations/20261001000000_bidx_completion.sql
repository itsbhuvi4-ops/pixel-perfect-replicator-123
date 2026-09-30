-- BidX Auction completion: storage buckets used by player registration.

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('player-videos', 'player-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Photos are readable by everyone (used on the public stage).
DROP POLICY IF EXISTS "player reads photos" ON storage.objects;
CREATE POLICY "photos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'player-photos');

-- Keep realtime in sync with the admin monitoring views.
ALTER PUBLICATION supabase_realtime ADD TABLE public.casters;

-- History stays immutable for everyone except the service role, which the
-- admin panel uses to requeue unsold players for a later round.
CREATE OR REPLACE FUNCTION public.block_history_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'History is immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
