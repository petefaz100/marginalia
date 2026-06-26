-- marginalia — admin-only mod approval
-- Step 14. Run this in the Supabase SQL Editor AFTER 0001–0010.
--
-- Until now, any mod could read the "become a mod" applications queue and grant
-- mod abilities. We're locking that power to a single ADMIN account (the site
-- owner) so only one person decides who becomes a mod. Regular mods keep all
-- their other powers (reviewing/adding art, handling reports) — they just can't
-- approve new mods.
--
-- "Admin" is identified by email so it never depends on a row that could be
-- edited. Change the address in is_admin() if the owner account ever changes.

-- ---------------------------------------------------------------------------
-- 1) is_admin(): true only for the owner account, matched by email.
--    SECURITY DEFINER so it can read auth.users; STABLE since it only reads.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'peterfazon@gmail.com'
  );
$$;

-- Make sure the owner account is also a mod, so the admin can do everything a
-- mod can in addition to approving applications.
update public.profiles
set is_mod = true
where id in (
  select id from auth.users where lower(email) = 'peterfazon@gmail.com'
);

-- ---------------------------------------------------------------------------
-- 2) accept_mod_application(app_id): now ADMIN-only.
--    Same behavior as before (match email → grant mod → notify → clear the
--    application), but the guard is is_admin() instead of is_mod().
-- ---------------------------------------------------------------------------
create or replace function public.accept_mod_application(app_id uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_email text;
  v_uid   uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the admin can approve mods.';
  end if;

  select email into v_email
  from public.mod_applications
  where id = app_id;

  if v_email is null then
    return 'not_found';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = lower(v_email)
  limit 1;

  if v_uid is null then
    return 'no_account';
  end if;

  update public.profiles set is_mod = true where id = v_uid;

  insert into public.notifications (recipient_id, kind)
  values (v_uid, 'mod_granted');

  delete from public.mod_applications where id = app_id;

  return 'granted';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Lock the applications queue (read + delete) to the admin.
--    Submitting an application stays open to anyone (that policy is untouched).
-- ---------------------------------------------------------------------------
drop policy if exists "mods can read mod applications" on public.mod_applications;
drop policy if exists "admin can read mod applications" on public.mod_applications;
create policy "admin can read mod applications"
  on public.mod_applications for select
  using (public.is_admin());

drop policy if exists "mods can delete mod applications" on public.mod_applications;
drop policy if exists "admin can delete mod applications" on public.mod_applications;
create policy "admin can delete mod applications"
  on public.mod_applications for delete
  using (public.is_admin());
