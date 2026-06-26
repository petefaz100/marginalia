"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mods flip pending pieces to approved (visible to readers past the chapter) or
// rejected (hidden from everyone but the uploader). Works on one id or many, so
// the queue can approve/reject in bulk. RLS already restricts these updates to
// mods; we re-check here to fail with a clear message rather than a silent
// no-op if a non-mod somehow reaches the action.
export async function moderateArt(
  artworkIds: string[],
  status: "approved" | "rejected",
  bookIds: string[] = [],
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

  const { error } = await supabase
    .from("artworks")
    .update({ status })
    .in("id", ids);
  if (error) throw new Error(error.message);

  revalidatePath("/moderate");
  for (const bookId of new Set(bookIds.filter(Boolean))) {
    revalidatePath(`/books/${bookId}`);
  }
}
