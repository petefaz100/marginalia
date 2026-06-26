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

// What image types we accept, mapped to the file extension we store under.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — matches next.config's body limit.

// Submits a piece of fan art tagged to a chapter. The image file is stored in
// the 'art' storage bucket; the row is always created as 'pending' (RLS
// enforces this) so a mod approves it before non-uploaders can see it. The
// chosen chapter IS the spoiler level: the art stays hidden until a reader has
// marked that chapter read.
export async function submitArt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to submit art.");

  const bookId = String(formData.get("bookId") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();
  if (!bookId) throw new Error("Missing book.");
  if (!chapterId) throw new Error("Pick a chapter for this art.");

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const artistHandle = String(formData.get("artistHandle") ?? "").trim();
  const creditUrl = String(formData.get("creditUrl") ?? "").trim();

  // Store under the uploader's own folder so the storage policy accepts it.
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("art")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("art").getPublicUrl(path);

  const { error } = await supabase.from("artworks").insert({
    book_id: bookId,
    chapter_id: chapterId,
    image_url: publicUrl,
    title: title || null,
    artist_handle: artistHandle || null,
    credit_url: creditUrl || null,
    uploaded_by: user.id,
    status: "pending",
  });
  if (error) {
    // Best-effort cleanup so a failed insert doesn't orphan the file.
    await supabase.storage.from("art").remove([path]);
    throw new Error(error.message);
  }

  revalidatePath(`/books/${bookId}`);
}

// Flags a piece of art for mod review. Anyone signed in can file one; only
// mods can read the resulting report queue (enforced by RLS).
export async function reportArt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to report art.");

  const artworkId = String(formData.get("artworkId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!artworkId) throw new Error("Missing artwork.");

  const { error } = await supabase.from("reports").insert({
    artwork_id: artworkId,
    reported_by: user.id,
    reason: reason || null,
  });
  if (error) throw new Error(error.message);
}
