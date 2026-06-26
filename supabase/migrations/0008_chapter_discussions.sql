-- marginalia — flat per-chapter discussions
-- Step 11. Run this in the Supabase SQL Editor AFTER 0001–0007.
--
-- The discussion UI is changing from "users start named threads" to a single
-- flat comment stream per chapter (comment + one level of replies), matching the
-- prototype's "talk" tab. Rather than rebuild the schema, we keep the existing
-- threads/comments/votes tables and introduce ONE implicit, author-less thread
-- per chapter that holds every comment for that chapter. The app never shows the
-- "thread" concept — readers just see comments and a composer.
--
-- ensure_chapter_thread(cid) returns the id of that chapter's discussion thread,
-- creating it on first use. It is SECURITY DEFINER so it can:
--   • create an author_id = NULL thread (the "start threads" insert policy
--     requires author_id = auth.uid(), which an implicit thread can't satisfy);
--   • still refuse callers who haven't unlocked the chapter or chosen a username.
-- The gate is re-checked here so this function can't be used to bypass spoilers.

create or replace function public.ensure_chapter_thread(cid uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_book_id uuid;
  v_number  int;
  v_thread  uuid;
begin
  -- Caller must have a public username and have unlocked this chapter.
  if not public.has_username() then
    raise exception 'username required';
  end if;
  if not public.can_see_chapter(cid) then
    raise exception 'chapter is locked';
  end if;

  select c.book_id, c.number into v_book_id, v_number
  from public.chapters c
  where c.id = cid;

  if v_book_id is null then
    raise exception 'no such chapter';
  end if;

  -- The implicit thread is the author-less one anchored to this chapter. Reuse it
  -- if present; otherwise create it. (Older author-owned threads from the prior
  -- model still exist and their comments still surface — see book page fetch.)
  select id into v_thread
  from public.threads
  where chapter_id = cid and author_id is null
  order by created_at
  limit 1;

  if v_thread is null then
    insert into public.threads (book_id, chapter_id, author_id, title)
    values (v_book_id, cid, null, 'Chapter ' || v_number || ' discussion')
    returning id into v_thread;
  end if;

  return v_thread;
end;
$$;
