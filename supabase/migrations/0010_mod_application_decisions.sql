-- marginalia — mod application roles + accept/reject decisions
-- Step 13. Run this in the Supabase SQL Editor AFTER 0001–0009.
--
-- Two changes to the "apply to be a mod" flow:
--   1. The role choices are now simply Artist / Author / Reader.
--   2. A mod can ACCEPT an application from the queue. Accepting finds the
--      account whose email matches the application, flips that profile to a mod,
--      and drops a notification in their inbox so they learn they now have mod
--      abilities. Rejecting just removes the application (handled in app code).

-- ---------------------------------------------------------------------------
-- 1) New, simpler role set.
-- ---------------------------------------------------------------------------
-- Drop the old constraint first so we can rewrite any existing rows, then remap
-- the previous role names onto the new set before re-adding the constraint.
-- (Any unexpected value falls back to 'reader' so the constraint can't fail.)
alter table public.mod_applications
  drop constraint if exists mod_applications_role_check;

update public.mod_applications set role = 'artist' where role = 'book_artist';
update public.mod_applications set role = 'author' where role = 'artist_or_author';
update public.mod_applications
  set role = 'reader'
  where role not in ('artist', 'author', 'reader');

alter table public.mod_applications
  add constraint mod_applications_role_check
  check (role in ('artist', 'author', 'reader'));

-- ---------------------------------------------------------------------------
-- 2) A new notification kind for "you're now a mod".
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'art_approved', 'art_rejected', 'reply_thread', 'reply_comment', 'mod_granted'
  ));

-- ---------------------------------------------------------------------------
-- 3) accept_mod_application(app_id): grant mod to the matching account.
--
-- SECURITY DEFINER so it can read auth.users (to match the applicant's email to
-- an account) and write the notification past the "mods only" insert policy. It
-- still refuses callers who aren't mods. Returns a short status the app reads:
--   'granted'   — account found, made a mod, notified, application cleared
--   'no_account'— no account uses that email yet (application left in the queue)
--   'not_found' — the application id no longer exists
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
  if not public.is_mod() then
    raise exception 'Mods only.';
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
