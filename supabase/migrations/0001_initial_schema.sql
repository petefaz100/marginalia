-- marginalia — initial schema + Row Level Security
-- Step 2 of the build. Run this in the Supabase SQL Editor.
--
-- The product wedge lives in the artworks SELECT policy near the bottom:
-- a reader can only see approved art tagged to chapters they have already
-- marked read. This is enforced in the database, so the spoiler gate holds
-- even if the UI is bypassed.

-- ===========================================================================
-- TABLES
-- ===========================================================================

-- profiles: extends Supabase's built-in auth.users with public-facing fields.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text unique not null,
  display_name  text,
  avatar_url    text,
  is_mod        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- books: open submission, instant. Moderation happens on art, not books.
create table public.books (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text,
  year            int,
  series          text,
  cover_url       text,
  google_books_id text,
  is_indie        boolean not null default false,
  submitted_by    uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- chapters: community-defined. THIS is the spoiler boundary.
create table public.chapters (
  id        uuid primary key default gen_random_uuid(),
  book_id   uuid not null references public.books (id) on delete cascade,
  number    int not null,
  title     text,
  unique (book_id, number)
);

-- artworks: fan art, each tied to a chapter (= its spoiler level).
create table public.artworks (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references public.books (id) on delete cascade,
  chapter_id    uuid not null references public.chapters (id) on delete cascade,
  image_url     text not null,
  title         text,
  artist_handle text,
  credit_url    text,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

-- reading_progress: per user, per book. The reader's position in the book.
create table public.reading_progress (
  user_id              uuid not null references public.profiles (id) on delete cascade,
  book_id              uuid not null references public.books (id) on delete cascade,
  chapter_read_through int not null default 0,
  primary key (user_id, book_id)
);

-- reports: a reader flags a piece of art for mod review.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  artwork_id  uuid not null references public.artworks (id) on delete cascade,
  reported_by uuid references public.profiles (id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- Helpful indexes for the queries we'll run most.
create index artworks_book_chapter_idx on public.artworks (book_id, chapter_id);
create index artworks_status_idx on public.artworks (status);
create index chapters_book_idx on public.chapters (book_id);

-- ===========================================================================
-- AUTO-CREATE A PROFILE WHEN SOMEONE SIGNS UP
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_handle text;
begin
  base_handle := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(new.email, '@', 1),
    'reader'
  );

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    -- suffix a slice of the uuid to keep handles unique on first sign-in
    base_handle || '_' || substr(new.id::text, 1, 4),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      base_handle
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- MOD CHECK HELPER
-- SECURITY DEFINER so policies can check mod status without tripping over RLS.
-- ===========================================================================

create or replace function public.is_mod()
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_mod
  );
$$;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

alter table public.profiles         enable row level security;
alter table public.books            enable row level security;
alter table public.chapters         enable row level security;
alter table public.artworks         enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reports          enable row level security;

-- ---- profiles -------------------------------------------------------------
-- Public read (needed to show artist credit + handles everywhere).
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

-- You may edit only your own profile.
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- books ----------------------------------------------------------------
-- Browsing is open to everyone, signed in or not.
create policy "books are publicly readable"
  on public.books for select
  using (true);

-- Any signed-in reader can add a book (instant, no mod gate).
create policy "authenticated users can add books"
  on public.books for insert
  to authenticated
  with check (auth.uid() = submitted_by);

-- The submitter or a mod can edit a book; only mods can delete.
create policy "submitter or mod can update books"
  on public.books for update
  using (submitted_by = auth.uid() or public.is_mod())
  with check (submitted_by = auth.uid() or public.is_mod());

create policy "mods can delete books"
  on public.books for delete
  using (public.is_mod());

-- ---- chapters -------------------------------------------------------------
-- Chapter list (numbers/titles) is public so the chapter rail can render.
create policy "chapters are publicly readable"
  on public.chapters for select
  using (true);

-- The first person to add art defines a book's chapters, so any signed-in
-- reader can create chapters.
create policy "authenticated users can add chapters"
  on public.chapters for insert
  to authenticated
  with check (true);

-- Editing/removing chapters shifts the spoiler boundary, so mods only.
create policy "mods can update chapters"
  on public.chapters for update
  using (public.is_mod())
  with check (public.is_mod());

create policy "mods can delete chapters"
  on public.chapters for delete
  using (public.is_mod());

-- ---- artworks (THE SPOILER GATE) ------------------------------------------
-- A row is visible when ANY of these is true:
--   1. it's your own upload (so you can see your pending submissions), or
--   2. you're a mod (the approval queue needs to see everything), or
--   3. it's APPROVED *and* its chapter is at or before the chapter you have
--      marked read in that book. Readers with no progress (and logged-out
--      visitors) have an effective position of 0, so they see no gated art
--      until they sign in and mark a chapter read.
create policy "gated read of approved art"
  on public.artworks for select
  using (
    uploaded_by = auth.uid()
    or public.is_mod()
    or (
      status = 'approved'
      and exists (
        select 1
        from public.chapters c
        where c.id = artworks.chapter_id
          and c.number <= coalesce(
            (
              select rp.chapter_read_through
              from public.reading_progress rp
              where rp.user_id = auth.uid()
                and rp.book_id = artworks.book_id
            ),
            0
          )
      )
    )
  );

-- Signed-in readers can submit art, always as 'pending' and credited to self.
create policy "authenticated users can submit art"
  on public.artworks for insert
  to authenticated
  with check (auth.uid() = uploaded_by and status = 'pending');

-- Only mods flip status (approve/reject) or otherwise edit art.
create policy "mods can update art"
  on public.artworks for update
  using (public.is_mod())
  with check (public.is_mod());

-- The uploader can withdraw their own piece; mods can remove anything.
create policy "uploader or mod can delete art"
  on public.artworks for delete
  using (uploaded_by = auth.uid() or public.is_mod());

-- ---- reading_progress -----------------------------------------------------
-- Your reading position is private to you.
create policy "read own progress"
  on public.reading_progress for select
  using (auth.uid() = user_id);

create policy "insert own progress"
  on public.reading_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "update own progress"
  on public.reading_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- reports --------------------------------------------------------------
-- Signed-in readers can file a report; only mods can read the queue.
create policy "authenticated users can file reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reported_by);

create policy "mods can read reports"
  on public.reports for select
  using (public.is_mod());

create policy "mods can delete reports"
  on public.reports for delete
  using (public.is_mod());
