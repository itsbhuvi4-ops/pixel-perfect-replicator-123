
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_player_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_player_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_bid(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.caster_set_status(public.auction_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.caster_next_player() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.caster_end_bidding() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_set_status(public.auction_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_next_player() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caster_end_bidding() TO authenticated;
