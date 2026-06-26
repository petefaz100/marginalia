"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Mods flip a pending piece to approved (it becomes visible to readers past its
// chapter) or rejected (hidden from everyone but the uploader). RLS already
// restricts these updates to mods; we re-check here to fail with a clear
// message instead of a silent no-op if a non-mod somehow reaches the action.
async function setArtStatus(
  formData: FormData,
  status: "approved" | "rejected",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: isMod } = await supabase.rpc("is_mod");
  if (!isMod) throw new Error("Mods only.");

  const artworkId = String(formData.get("artworkId") ?? "").trim();
  const bookId = String(formData.get("bookId") ?? "").trim();
  if (!artworkId) throw new Error("Missing artwork.");

  const { error } = await supabase
    .from("artworks")
    .update({ status })
    .eq("id", artworkId);
  if (error) throw new Error(error.message);

  revalidatePath("/moderate");
  if (bookId) revalidatePath(`/books/${bookId}`);
}

export async function approveArt(formData: FormData) {
  await setArtStatus(formData, "approved");
}

export async function rejectArt(formData: FormData) {
  await setArtStatus(formData, "rejected");
}
