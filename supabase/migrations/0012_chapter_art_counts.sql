-- marginalia — per-chapter approved-art counts for a single book
-- Step 15. Run this in the Supabase SQL Editor AFTER 0001–0011.
--
-- The artworks SELECT policy (0001) gates art per reader: you only ever
-- receive rows for chapters you've marked read. That's the spoiler gate, and
-- it's exactly what we want — locked art's image_url never reaches the browser.
--
-- But the book page now shows a "what's waiting ahead" teaser: blurred,
-- decorative placeholder tiles labelled with their chapter, one per locked
-- piece, so a reader can see how much art is coming without it being spoiled.
-- To draw the right NUMBER of placeholders per chapter, the page needs a count
-- of approved art per chapter for the WHOLE book — including locked chapters.
--
-- This SECURITY DEFINER function returns ONLY those counts (chapter_id + n).
-- It never exposes an image, title, artist, or any other spoiler content, so
-- the gate stays intact: the client learns "chapter 12 has 3 pieces," never
-- what they are or what they look like.

create or replace function public.book_chapter_art_counts(bid uuid)
returns table (chapter_id uuid, n integer)
language sql
security definer set search_path = ''
stable
as $$
  select a.chapter_id, count(*)::int
  from public.artworks a
  where a.book_id = bid
    and a.status = 'approved'
  group by a.chapter_id;
$$;

grant execute on function public.book_chapter_art_counts(uuid) to anon, authenticated;
