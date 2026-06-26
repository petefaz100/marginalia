-- marginalia — per-book approved-art counts for the library
--
-- The artworks SELECT policy (0001) gates art per reader: you only see
-- approved art at or below the chapter you've marked read. That means the
-- library page can't tell which books actually have art — a logged-out or
-- early reader would see every book as empty.
--
-- This SECURITY DEFINER function bypasses the per-reader gate to return a
-- simple COUNT of approved art per book. It exposes only counts — never a
-- title, image, or chapter — so no spoiler content leaks. The library uses it
-- to sort books-with-art first and flag the rest as empty.

create or replace function public.books_art_counts()
returns table (book_id uuid, art_count bigint)
language sql
security definer set search_path = ''
stable
as $$
  select a.book_id, count(*)::bigint
  from public.artworks a
  where a.status = 'approved'
  group by a.book_id;
$$;

grant execute on function public.books_art_counts() to anon, authenticated;
