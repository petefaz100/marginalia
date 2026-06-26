-- marginalia — art image storage
-- Step 6 of the build. Run this in the Supabase SQL Editor (one paste).
--
-- The artworks TABLE already exists (step 2) and stores each piece's metadata
-- plus an image_url. This migration creates the STORAGE bucket that actually
-- holds the uploaded image files, and the policies that decide who can put
-- files in and who can read them.
--
-- Note on the spoiler gate: the bucket is public-read, but that does NOT leak
-- spoilers. A reader can only ever discover an image's URL by reading its
-- artworks row, and the artworks RLS policy (step 2) hides rows for chapters
-- the reader hasn't reached. No row, no URL, no peek.

-- ---------------------------------------------------------------------------
-- BUCKET
-- ---------------------------------------------------------------------------
-- public = true so approved art renders with a plain <img src>. Idempotent:
-- re-running just leaves the existing bucket in place.
insert into storage.buckets (id, name, public)
values ('art', 'art', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- POLICIES on storage.objects (scoped to the 'art' bucket)
-- ---------------------------------------------------------------------------

-- Anyone can read art files (the gate is on the artworks row, see header).
create policy "art images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'art');

-- Any signed-in reader can upload, but only into a folder named after their
-- own user id (e.g. "<uid>/whatever.jpg"). This keeps one reader from
-- overwriting another's files and matches how the app builds the path.
create policy "authenticated users can upload art"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'art'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A reader can remove their own files; mods can remove any art file.
create policy "uploader or mod can delete art images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'art'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_mod()
    )
  );
