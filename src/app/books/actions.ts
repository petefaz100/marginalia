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

// Chapters are community-defined — any signed-in reader can add one. A chapter's
// number IS the spoiler boundary: art tagged to it is hidden until a reader has
// marked that chapter read.
export async function addChapter(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add a chapter.");

  const bookId = String(formData.get("bookId") ?? "").trim();
  const number = Number(String(formData.get("number") ?? "").trim());
  const title = String(formData.get("title") ?? "").trim();
  if (!bookId) throw new Error("Missing book.");
  if (!Number.isInteger(number) || number < 1) {
    throw new Error("Chapter number must be a positive whole number.");
  }

  const { error } = await supabase
    .from("chapters")
    .insert({ book_id: bookId, number, title: title || null });
  // 23505 = unique_violation: that chapter number already exists. Ignore so the
  // action is idempotent rather than erroring on a duplicate add.
  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath(`/books/${bookId}`);
}

// Records how far a reader has gotten. This is the value the RLS gate compares
// chapter numbers against, so moving it forward reveals more art.
export async function setReadThrough(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to track progress.");

  const bookId = String(formData.get("bookId") ?? "").trim();
  const through = Number(String(formData.get("through") ?? "").trim());
  if (!bookId) throw new Error("Missing book.");
  if (!Number.isInteger(through) || through < 0) {
    throw new Error("Invalid chapter.");
  }

  const { error } = await supabase.from("reading_progress").upsert(
    { user_id: user.id, book_id: bookId, chapter_read_through: through },
    { onConflict: "user_id,book_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/books/${bookId}`);
}
