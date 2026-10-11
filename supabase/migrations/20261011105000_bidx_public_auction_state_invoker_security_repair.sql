-- Ensure the public auction-state view evaluates privileges and RLS as the querying role.
ALTER VIEW public.bidx_public_auction_state SET (security_invoker = true);
