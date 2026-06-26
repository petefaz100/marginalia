"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { VoteTarget } from "@/lib/supabase/types";

type Result = { ok: boolean; message?: string };

// Start a discussion thread anchored to a chapter. The chapter sets the spoiler
// level: the thread only shows to readers who've reached it. RLS enforces the
// real rules (must have a username, chapter must be unlocked, author = self);
// we surface friendly messages here and revalidate the page on success.
export async function createThread(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const bookId = String(formData.get("bookId") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!bookId || !chapterId) return { ok: false, message: "Missing chapter." };
  if (!title) return { ok: false, message: "Give your thread a title." };
  if (title.length > 140)
    return { ok: false, message: "Keep the title under 140 characters." };

  const { error } = await supabase.from("threads").insert({
    book_id: bookId,
    chapter_id: chapterId,
    author_id: user.id,
    title,
    body: body || null,
  });
  if (error) {
    // RLS rejects the insert (e.g. no username yet, or chapter still locked).
    return {
      ok: false,
      message:
        "Couldn't post that — make sure you've set a username and have read through this chapter.",
    };
  }

  revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

// Add a comment to a thread, or a reply to a comment (parentId set). A trigger
// drops a notification into the thread/comment author's inbox. RLS requires a
// username and that the thread's chapter is unlocked for the commenter.
export async function addComment(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const bookId = String(formData.get("bookId") ?? "").trim();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!threadId) return { ok: false, message: "Missing thread." };
  if (!body) return { ok: false, message: "Write something first." };
  if (body.length > 4000)
    return { ok: false, message: "That comment is too long." };

  const { error } = await supabase.from("comments").insert({
    thread_id: threadId,
    parent_id: parentId || null,
    author_id: user.id,
    body,
  });
  if (error) {
    return {
      ok: false,
      message:
        "Couldn't post that — make sure you've set a username and have read through this chapter.",
    };
  }

  if (bookId) revalidatePath(`/books/${bookId}`);
  return { ok: true };
}

// Cast, change, or clear a vote on a thread or comment. Voting again with the
// same direction toggles the vote off; voting the other way flips it. One row
// per (user, target) is guaranteed by the table's primary key.
export async function castVote(
  targetType: VoteTarget,
  targetId: string,
  value: 1 | -1,
  bookId: string,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };
  if (!targetId) return { ok: false, message: "Missing target." };

  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing && existing.value === value) {
    // Same direction again → remove the vote.
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId);
    if (error) return { ok: false, message: error.message };
  } else {
    // New vote or a flip → upsert the row.
    const { error } = await supabase.from("votes").upsert(
      { user_id: user.id, target_type: targetType, target_id: targetId, value },
      { onConflict: "user_id,target_type,target_id" },
    );
    if (error) {
      return {
        ok: false,
        message: "Couldn't record your vote — have you set a username?",
      };
    }
  }

  if (bookId) revalidatePath(`/books/${bookId}`);
  return { ok: true };
}
