-- marginalia — discussions, public usernames, voting, and reply notifications
-- Step 10. Run this in the Supabase SQL Editor AFTER 0001–0006.
--
-- This adds the social layer on top of the spoiler gate:
--   • a public, user-chosen USERNAME (separate from the real name we keep
--     private) that must be set before anyone can post, comment, vote, or
--     submit publicly;
--   • chapter DISCUSSION THREADS and nested COMMENTS, gated by the SAME spoiler
--     rule as art — you only see threads for chapters you've marked read;
--   • up/down VOTES on threads and comments, one per user per target;
--   • REPLY NOTIFICATIONS dropped into a reader's inbox when someone replies to
--     their thread or comment.
--
-- The privacy/spoiler model mirrors artworks exactly, enforced in the database
-- so it holds even if the UI is bypassed.

-- ===========================================================================
-- 1. PUBLIC USERNAME ON PROFILES
-- ===========================================================================
-- `handle` (existing) stays an auto-generated internal id; `display_name` holds
-- the real name from Google and is NOT shown publicly. `username` is the
-- reader's chosen public name. NULL means "not chosen yet" — the app prompts
-- for one before allowing any public write.

alter table public.profiles
  add column if not exists username text;

-- Case-insensitive uniqueness: "Rhys" and "rhys" can't both exist.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- True once the signed-in reader has chosen a username. Used by every
-- public-write policy below so the gate is enforced server-side, not just in UI.
create or replace function public.has_username()
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and username is not null
  );
$$;

-- ===========================================================================
-- 2. SPOILER-GATE HELPER
-- ===========================================================================
-- A chapter is visible to the caller when they're a mod, or the chapter's
-- number is at or below how far they've read in that book. Logged-out callers
-- (and readers with no progress row) have an effective position of 0. This is
-- the same rule the artworks SELECT policy expresses inline; threads/comments
-- reuse it so the gate stays identical everywhere.
create or replace function public.can_see_chapter(cid uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select
    public.is_mod()
    or exists (
      select 1
      from public.chapters c
      where c.id = cid
        and c.number <= coalesce(
          (
            select rp.chapter_read_through
            from public.reading_progress rp
            where rp.user_id = auth.uid()
              and rp.book_id = c.book_id
          ),
          0
        )
    );
$$;

-- ===========================================================================
-- 3. TABLES
-- ===========================================================================

-- threads: a discussion topic anchored to one chapter (= its spoiler level).
create table if not exists public.threads (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books (id) on delete cascade,
  chapter_id  uuid not null references public.chapters (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  title       text not null,
  body        text,
  created_at  timestamptz not null default now()
);

-- comments: a message in a thread. parent_id null = top-level; otherwise it's a
-- reply to another comment (the app keeps replies to one level for now).
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.threads (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- votes: one row per (user, target). value is +1 (up) or -1 (down). Changing a
-- vote updates the row; removing a vote deletes it. Score = sum(value).
create table if not exists public.votes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('thread', 'comment')),
  target_id   uuid not null,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index if not exists threads_book_chapter_idx
  on public.threads (book_id, chapter_id, created_at desc);
create index if not exists comments_thread_idx
  on public.comments (thread_id, created_at);
create index if not exists votes_target_idx
  on public.votes (target_type, target_id);

-- ===========================================================================
-- 4. ROW LEVEL SECURITY
-- ===========================================================================

alter table public.threads  enable row level security;
alter table public.comments enable row level security;
alter table public.votes    enable row level security;

-- ---- threads --------------------------------------------------------------
-- See a thread if you wrote it, or its chapter is unlocked for you (mods see all
-- via can_see_chapter). This is the spoiler gate for discussions.
create policy "gated read of threads"
  on public.threads for select
  using (author_id = auth.uid() or public.can_see_chapter(chapter_id));

-- Start a thread only in an unlocked chapter, credited to yourself, and only
-- once you've chosen a public username.
create policy "users with a username can start threads"
  on public.threads for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.has_username()
    and public.can_see_chapter(chapter_id)
  );

-- The author can edit their own thread; mods can edit any (content moderation).
create policy "author or mod can update threads"
  on public.threads for update
  using (author_id = auth.uid() or public.is_mod())
  with check (author_id = auth.uid() or public.is_mod());

-- The author can delete their own thread; mods can remove any.
create policy "author or mod can delete threads"
  on public.threads for delete
  using (author_id = auth.uid() or public.is_mod());

-- ---- comments -------------------------------------------------------------
-- See a comment if you wrote it, or you can see its parent thread.
create policy "gated read of comments"
  on public.comments for select
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.threads t
      where t.id = comments.thread_id
        and (t.author_id = auth.uid() or public.can_see_chapter(t.chapter_id))
    )
  );

-- Comment only on a thread you can see, credited to yourself, with a username.
create policy "users with a username can comment"
  on public.comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.has_username()
    and exists (
      select 1 from public.threads t
      where t.id = comments.thread_id
        and public.can_see_chapter(t.chapter_id)
    )
  );

create policy "author or mod can update comments"
  on public.comments for update
  using (author_id = auth.uid() or public.is_mod())
  with check (author_id = auth.uid() or public.is_mod());

create policy "author or mod can delete comments"
  on public.comments for delete
  using (author_id = auth.uid() or public.is_mod());

-- ---- votes ----------------------------------------------------------------
-- Vote tallies are public so scores can be shown to everyone.
create policy "votes are publicly readable"
  on public.votes for select
  using (true);

-- You may only cast/change/remove your OWN vote, and only with a username.
create policy "users with a username can vote"
  on public.votes for insert
  to authenticated
  with check (user_id = auth.uid() and public.has_username());

create policy "update own vote"
  on public.votes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "remove own vote"
  on public.votes for delete
  using (user_id = auth.uid());

-- ===========================================================================
-- 5. REPLY NOTIFICATIONS
-- ===========================================================================
-- Extend the existing notifications table to carry discussion replies, then a
-- trigger creates the notification automatically when a comment is inserted.

alter table public.notifications
  add column if not exists actor_id       uuid references public.profiles (id) on delete set null,
  add column if not exists thread_id      uuid references public.threads (id) on delete cascade,
  add column if not exists comment_id     uuid references public.comments (id) on delete cascade,
  add column if not exists chapter_number int;

-- Widen the kind check to include the two reply kinds.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('art_approved', 'art_rejected', 'reply_thread', 'reply_comment'));

-- On every new comment, notify whoever it replies to (thread author for a
-- top-level comment, parent-comment author for a nested reply). We never notify
-- people about their own replies. SECURITY DEFINER so the insert isn't blocked
-- by the "mods only" notifications insert policy.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_book_id    uuid;
  v_chapter_no int;
  v_recipient  uuid;
begin
  select t.book_id, c.number
    into v_book_id, v_chapter_no
  from public.threads t
  join public.chapters c on c.id = t.chapter_id
  where t.id = new.thread_id;

  if new.parent_id is not null then
    select author_id into v_recipient
    from public.comments where id = new.parent_id;
  else
    select author_id into v_recipient
    from public.threads where id = new.thread_id;
  end if;

  if v_recipient is not null and v_recipient <> new.author_id then
    insert into public.notifications
      (recipient_id, kind, actor_id, thread_id, comment_id, book_id, chapter_number)
    values
      (v_recipient,
       case when new.parent_id is not null then 'reply_comment' else 'reply_thread' end,
       new.author_id, new.thread_id, new.id, v_book_id, v_chapter_no);
  end if;

  return new;
end;
$$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ===========================================================================
-- 6. MODERATORS ADD ART DIRECTLY (NO REVIEW QUEUE)
-- ===========================================================================
-- The original insert policy (0001) only lets a reader add art as 'pending',
-- so it lands in the mod queue. Moderators don't need their own work reviewed:
-- this extra policy lets a mod insert a piece already 'approved' (still credited
-- to themselves), so it shows immediately to anyone who's reached the chapter.
-- Both insert policies coexist; a write passes if EITHER allows it.
drop policy if exists "mods can add approved art directly" on public.artworks;
create policy "mods can add approved art directly"
  on public.artworks for insert
  to authenticated
  with check (public.is_mod() and auth.uid() = uploaded_by and status = 'approved');
