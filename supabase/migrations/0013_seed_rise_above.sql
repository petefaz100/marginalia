-- marginalia — seed the first indie book: "Rise Above" by C.M. Stewart (2026).
-- Run this in the Supabase SQL Editor (one paste). Safe to re-run: the
-- WHERE NOT EXISTS guard skips the book if it's already in the library
-- (matched on title + author), so you won't get duplicates.
--
-- Unlike Google Books titles, indie books have no google_books_id. We mark it
-- is_indie = true so it shows the "Indie" ribbon and appears under the
-- "Indie books" filter, and attribute it to the admin (peterfazon@gmail.com)
-- as the submitter. The cover lives in the app at /public/covers/rise-above.jpg.

insert into public.books (title, author, year, cover_url, is_indie, submitted_by)
select
  'Rise Above',
  'C.M. Stewart',
  2026,
  '/covers/rise-above.jpg',
  true,
  (select id from auth.users where email = 'peterfazon@gmail.com' limit 1)
where not exists (
  select 1 from public.books b
  where b.title = 'Rise Above' and b.author = 'C.M. Stewart'
);
