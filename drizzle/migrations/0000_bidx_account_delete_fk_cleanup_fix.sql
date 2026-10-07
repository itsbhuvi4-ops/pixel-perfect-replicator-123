CREATE OR REPLACE FUNCTION public.block_history_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('bidx.account_delete', true) = 'on'
     AND (
       (OLD.player_id IS NOT NULL AND NEW.player_id IS NULL)
       OR (OLD.ambassador_id IS NOT NULL AND NEW.ambassador_id IS NULL)
     )
     AND (NEW.player_id IS NULL OR NEW.player_id IS NOT DISTINCT FROM OLD.player_id)
     AND (NEW.ambassador_id IS NULL OR NEW.ambassador_id IS NOT DISTINCT FROM OLD.ambassador_id)
     AND (to_jsonb(OLD) - 'player_id' - 'ambassador_id')
         = (to_jsonb(NEW) - 'player_id' - 'ambassador_id')
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'History is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.bidx_handle_auth_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('bidx.account_delete', 'on', true);
  DELETE FROM public.player_contacts WHERE user_id = OLD.id;
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  DELETE FROM public.players WHERE user_id = OLD.id;
  DELETE FROM public.ambassadors WHERE user_id = OLD.id;
  DELETE FROM public.casters WHERE user_id = OLD.id;
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.bidx_handle_auth_user_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_history_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bidx_auth_user_delete ON auth.users;
CREATE TRIGGER bidx_auth_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bidx_handle_auth_user_delete();