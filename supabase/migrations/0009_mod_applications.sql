-- marginalia — "apply to be a mod" applications
-- Step 12. Run this in the Supabase SQL Editor AFTER 0001–0008.
--
-- The home page's "apply to be a mod" button now leads to a public /apply form.
-- Anyone (signed in or not) can submit one application; the submission lands in
-- this table, which the mod queue (/moderate) reads. This mirrors the existing
-- `reports` pattern: open insert, mod-only read/delete.
--
--   role is one of: 'book_artist', 'artist_or_author', 'reader'
--   created_by is the submitter's profile when they happen to be signed in,
--   otherwise NULL (the form is usable by signed-out visitors too).

create table public.mod_applications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  role        text not null check (role in ('book_artist', 'artist_or_author', 'reader')),
  reason      text not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.mod_applications enable row level security;

-- Anyone can submit an application (the form is public — no sign-in required).
create policy "anyone can submit a mod application"
  on public.mod_applications for insert
  to anon, authenticated
  with check (true);

-- Only mods can read the queue of applications.
create policy "mods can read mod applications"
  on public.mod_applications for select
  using (public.is_mod());

-- Only mods can clear an application off the queue.
create policy "mods can delete mod applications"
  on public.mod_applications for delete
  using (public.is_mod());
