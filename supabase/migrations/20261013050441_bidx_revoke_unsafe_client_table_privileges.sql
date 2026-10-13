-- Least-privilege repair: browser roles never need structural table privileges.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS relation_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %s FROM anon, authenticated',
      r.relation_name
    );
  END LOOP;
END $$;

-- These compatibility views are read-only public projections.
REVOKE INSERT, UPDATE, DELETE ON public.auction_players_public, public.auction_teams_public
  FROM anon, authenticated;
GRANT SELECT ON public.auction_players_public, public.auction_teams_public
  TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
