-- BidX Auction: make account deletion safe across auction history.
-- auth.users deletion cascades into profiles/user_roles/players/ambassadors/casters.
-- These historical tables previously blocked deletion because their player/ambassador
-- foreign keys did not specify an ON DELETE action.

ALTER TABLE public.auction_results
  DROP CONSTRAINT IF EXISTS auction_results_player_id_fkey,
  DROP CONSTRAINT IF EXISTS auction_results_ambassador_id_fkey;

ALTER TABLE public.auction_results
  ADD CONSTRAINT auction_results_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  ADD CONSTRAINT auction_results_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE CASCADE;

ALTER TABLE public.retain_records
  DROP CONSTRAINT IF EXISTS retain_records_player_id_fkey,
  DROP CONSTRAINT IF EXISTS retain_records_ambassador_id_fkey;

ALTER TABLE public.retain_records
  ADD CONSTRAINT retain_records_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE,
  ADD CONSTRAINT retain_records_ambassador_id_fkey
    FOREIGN KEY (ambassador_id) REFERENCES public.ambassadors(id) ON DELETE CASCADE;
