-- Snapshot functions are trigger-only helpers, never public RPC endpoints.
REVOKE ALL ON FUNCTION public.snapshot_player_before_delete() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.snapshot_ambassador_before_delete() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
