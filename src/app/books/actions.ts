"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Saves a Google Books result into our library. Books are open-submission (no
// moderation), but the row must be credited to the signed-in reader — the RLS
// insert policy enforces submitted_by = auth.uid().
export async function addBook(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add a book.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Missing title.");

  const googleBooksId = String(formData.get("googleBooksId") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const coverUrl = String(formData.get("coverUrl") ?? "").trim();

  // Don't add the same book twice.
  if (googleBooksId) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("google_books_id", googleBooksId)
      .maybeSingle();
    if (existing) {
      revalidatePath("/");
      return;
    }
  }

  const { error } = await supabase.from("books").insert({
    title,
    author: author || null,
    year: yearRaw ? Number(yearRaw) || null : null,
    cover_url: coverUrl || null,
    google_books_id: googleBooksId || null,
    submitted_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
