-- Tournament branding configuration for BidX Auction.
ALTER TABLE public.auction_state
  ADD COLUMN IF NOT EXISTS tournament_season text NOT NULL DEFAULT 'SEASON 1',
  ADD COLUMN IF NOT EXISTS tournament_logo_url text,
  ADD COLUMN IF NOT EXISTS auction_branding text NOT NULL DEFAULT 'BIDXAUCTION';

COMMENT ON COLUMN public.auction_state.tournament_season IS 'Admin-configured tournament season label.';
COMMENT ON COLUMN public.auction_state.tournament_logo_url IS 'Optional public logo URL used by the auction/broadcast branding.';
COMMENT ON COLUMN public.auction_state.auction_branding IS 'Admin-configured auction brand label.';
