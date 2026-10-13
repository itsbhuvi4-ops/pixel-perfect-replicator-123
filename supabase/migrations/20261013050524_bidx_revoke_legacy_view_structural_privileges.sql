-- Remove non-read privileges that were historically granted to the compatibility views.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.auction_players_public, public.auction_teams_public
  FROM anon, authenticated;
