-- marginalia — notifications inbox
-- Step 8 (post-MVP). Run this in the Supabase SQL Editor.
--
-- A notification is a one-directional, system-generated message TO a reader:
-- "your art was approved" / "your art was rejected (reason)". Mods don't write
-- these by hand — the moderation action creates them when a piece is approved
-- or rejected. Built to also carry future discussion-board notifications.
--
-- Privacy mirrors the spoiler gate: you can only ever read your OWN inbox, and
-- only mods can create notifications, so nobody can flood another reader.

-- ===========================================================================
-- TABLE
-- ===========================================================================

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind         text not null
                 check (kind in ('art_approved', 'art_rejected')),
  artwork_id   uuid references public.artworks (id) on delete set null,
  reason       text,            -- default rejection reason (null for approvals)
  note         text,            -- optional custom note from the mod
  read_at      timestamptz,     -- null = unread
  created_at   timestamptz not null default now()
);

-- Inbox query: a reader's notifications, newest first, unread highlighted.
create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

alter table public.notifications enable row level security;

-- You may read only your own inbox.
create policy "read own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

-- You may update only your own notifications, and only to mark them read.
create policy "mark own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- You may clear (delete) your own notifications.
create policy "delete own notifications"
  on public.notifications for delete
  using (auth.uid() = recipient_id);

-- Only mods can create notifications (done automatically on approve/reject).
create policy "mods can create notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_mod());
