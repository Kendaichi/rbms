-- RBMS — Milestone 4: role model hardening.
-- New auth signups default to 'customer' (NOT staff) so a storefront account can
-- never gain admin access. Staff/owner are granted explicitly (promote in SQL).
-- is_staff() already gates admin on role in ('owner','staff').

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'staff', 'customer'));
alter table public.profiles alter column role set default 'customer';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'customer')
  on conflict (id) do nothing;
  return new;
end $$;
