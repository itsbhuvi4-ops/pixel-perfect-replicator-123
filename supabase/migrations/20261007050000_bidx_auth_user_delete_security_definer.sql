-- BIDXAUCTION: make Auth user deletion independent of supabase_auth_admin
-- table DELETE privileges while preserving existing history/snapshot behavior.

create or replace function public.bidx_handle_auth_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  delete from public.player_contacts where user_id = old.id;
  delete from public.notifications where user_id = old.id;

  delete from public.players where user_id = old.id;
  delete from public.ambassadors where user_id = old.id;
  delete from public.casters where user_id = old.id;

  update public.auction_state
  set caster_owner_id = null,
      updated_at = now()
  where caster_owner_id = old.id;

  delete from public.user_roles where user_id = old.id;
  delete from public.profiles where id = old.id;

  return old;
end;
$function$;

revoke all on function public.bidx_handle_auth_user_delete() from public;
revoke all on function public.bidx_handle_auth_user_delete() from anon;
revoke all on function public.bidx_handle_auth_user_delete() from authenticated;

drop trigger if exists bidx_auth_user_delete on auth.users;

create trigger bidx_auth_user_delete
before delete on auth.users
for each row
execute function public.bidx_handle_auth_user_delete();

notify pgrst, 'reload schema';
