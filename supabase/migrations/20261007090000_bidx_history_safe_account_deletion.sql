-- BidX Auction: make account deletion history-safe across the current auction schema.
-- Historical/actor references become nullable and are preserved as rows.
-- Active/current-player references are cleared rather than blocking Auth deletion.

ALTER TABLE public.auction_events
  DROP CONSTRAINT IF EXISTS auction_events_actor_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_events_player_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_events_ambassador_id_fkey,
  ADD CONSTRAINT auction_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT auction_events_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT auction_events_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.auctions
  DROP CONSTRAINT IF EXISTS auctions_created_by_fkey,
  DROP CONSTRAINT IF EXISTS auctions_current_player_id_fkey,
  ADD CONSTRAINT auctions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT auctions_current_player_id_fkey
    FOREIGN KEY (current_player_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.auction_players
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE public.auction_players
  DROP CONSTRAINT IF EXISTS auction_players_player_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_players_highest_bidder_id_fkey,
  ADD CONSTRAINT auction_players_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT auction_players_highest_bidder_id_fkey
    FOREIGN KEY (highest_bidder_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.bids
  ALTER COLUMN ambassador_id DROP NOT NULL;

ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_ambassador_id_fkey,
  ADD CONSTRAINT bids_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.purchases
  ALTER COLUMN player_id DROP NOT NULL,
  ALTER COLUMN ambassador_id DROP NOT NULL;

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_player_id_fkey,
  DROP CONSTRAINT IF EXISTS purchases_ambassador_id_fkey,
  ADD CONSTRAINT purchases_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT purchases_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

ALTER TABLE public.retain_records
  ALTER COLUMN player_id DROP NOT NULL,
  ALTER COLUMN ambassador_id DROP NOT NULL;

ALTER TABLE public.retain_records
  DROP CONSTRAINT IF EXISTS retain_records_player_id_fkey,
  DROP CONSTRAINT IF EXISTS retain_records_ambassador_id_fkey,
  ADD CONSTRAINT retain_records_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL,
  ADD CONSTRAINT retain_records_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
