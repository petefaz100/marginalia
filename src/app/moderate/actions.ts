"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mods flip pending pieces to approved (visible to readers past the chapter) or
// rejected (hidden from everyone but the uploader). Works on one id or many, so
// the queue can approve/reject in bulk. RLS already restricts these updates to
// mods; we re-check here to fail with a clear message rather than a silent
// no-op if a non-mod somehow reaches the action.
//
// Every decision also drops a notification into each uploader's inbox so they
// learn the outcome. Rejections carry a per-piece reason (and optional note),
// keyed by artwork id, so a bulk reject can give each image its own reason;
// approvals are a simple "you're live" nudge.
export async function moderateArt(
  artworkIds: string[],
  status: "approved" | "rejected",
  bookIds: string[] = [],
  reasons: Record<string, { reason?: string; note?: string }> = {},
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: isMod } = await supabase.rpc("is_mod");
  if (!isMod) throw new Error("Mods only.");

  const ids = artworkIds.filter(Boolean);
  if (ids.length === 0) throw new Error("Nothing selected.");

  // Grab the uploader of each piece so we can notify them after the flip.
  const { data: targets } = await supabase
    .from("artworks")
    .select("id, uploaded_by")
    .in("id", ids);

  const { error } = await supabase
    .from("artworks")
    .update({ status })
    .in("id", ids);
  if (error) throw new Error(error.message);

  // Notify each uploader (skip pieces with no uploader on record).
  const kind = status === "approved" ? "art_approved" : "art_rejected";
  const rows = (targets ?? [])
    .filter((a) => a.uploaded_by)
    .map((a) => {
      const r = reasons[a.id];
      return {
        recipient_id: a.uploaded_by as string,
        kind: kind as "art_approved" | "art_rejected",
        artwork_id: a.id,
        reason: status === "rejected" ? r?.reason?.trim() || null : null,
        note: status === "rejected" ? r?.note?.trim() || null : null,
      };
    });
  if (rows.length > 0) {
    // Best-effort: a failed notification shouldn't undo a completed decision.
    await supabase.from("notifications").insert(rows);
  }

  revalidatePath("/moderate");
  for (const bookId of new Set(bookIds.filter(Boolean))) {
    revalidatePath(`/books/${bookId}`);
  }
}
