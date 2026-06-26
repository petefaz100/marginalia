"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mods approve pending pieces (making them visible to readers past the chapter)
// or reject them. Approve flips status to 'approved'; reject DELETES the row so
// the piece leaves everyone's view entirely — including the uploader's. Works on
// one id or many for bulk actions. RLS already restricts these writes to mods;
// we re-check here to fail with a clear message rather than a silent no-op.
//
// Every decision drops a notification into each uploader's inbox so they learn
// the outcome. Because a rejected artwork is deleted, we copy its image + title
// onto the notification so the uploader still sees a thumbnail of what was
// removed. Rejections carry a per-piece reason (keyed by artwork id) so a bulk
// reject can give each image its own reason; approvals are a "you're live" nudge.
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

  // Capture each piece's details before we touch it, so notifications can keep
  // a thumbnail even after a rejected row is deleted.
  const { data: targets } = await supabase
    .from("artworks")
    .select("id, uploaded_by, image_url, title, book_id")
    .in("id", ids);

  // Notify each uploader (skip pieces with no uploader on record). Done before
  // the delete so a rejected artwork's details are still available to copy.
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
        art_title: a.title,
        art_image_url: a.image_url,
        book_id: a.book_id,
      };
    });
  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  if (status === "approved") {
    const { error } = await supabase
      .from("artworks")
      .update({ status: "approved" })
      .in("id", ids);
    if (error) throw new Error(error.message);
  } else {
    // Reject = remove from the system. The stored image file is left in place
    // so the inbox thumbnail still loads.
    const { error } = await supabase.from("artworks").delete().in("id", ids);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/moderate");
  for (const bookId of new Set(bookIds.filter(Boolean))) {
    revalidatePath(`/books/${bookId}`);
  }
}

// Clears a reader's report without touching the art — the mod looked and judged
// the piece fine. RLS lets only mods delete reports.
export async function dismissReport(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: isMod } = await supabase.rpc("is_mod");
  if (!isMod) throw new Error("Mods only.");

  if (!reportId) throw new Error("Missing report.");

  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) throw new Error(error.message);

  revalidatePath("/moderate");
}

// Clears a "become a mod" application off the queue once a mod has handled it
// (reached out, or decided to pass). RLS lets only mods delete applications.
export async function dismissApplication(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: isMod } = await supabase.rpc("is_mod");
  if (!isMod) throw new Error("Mods only.");

  if (!applicationId) throw new Error("Missing application.");

  const { error } = await supabase
    .from("mod_applications")
    .delete()
    .eq("id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath("/moderate");
}
