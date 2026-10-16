-- Force owner-created users to set their own password on first sign-in.
-- The owner creates an account with a temporary password; profiles.
-- must_change_password gates /admin (via the proxy) until the user changes it.
-- complete_password_change() is SECURITY DEFINER so a staff user can clear their
-- OWN flag even though profiles writes are otherwise owner-only.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create or replace function public.complete_password_change() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;
grant execute on function public.complete_password_change() to authenticated;
