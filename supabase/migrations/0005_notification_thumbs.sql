-- marginalia — keep a thumbnail in the inbox after art is deleted
-- Step 9 (post-MVP). Run this in the Supabase SQL Editor AFTER 0004.
--
-- Rejecting (or removing a reported piece) now DELETES the artwork so it leaves
-- everyone's view. But the uploader should still see a thumbnail of what was
-- removed in their inbox, so we copy the image + title onto the notification
-- itself. book_id lets approved-art notifications link back to the book.

alter table public.notifications
  add column if not exists art_title     text,
  add column if not exists art_image_url text,
  add column if not exists book_id       uuid;
