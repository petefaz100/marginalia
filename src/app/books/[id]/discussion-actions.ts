"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { VoteTarget } from "@/lib/supabase/types";

type Result = { ok: boolean; message?: string };

// Add a comment to a chapter's discussion, or a reply to an existing comment.
//
// The UI is a flat per-chapter stream — there are no named threads. Under the
// hood each chapter still has ONE implicit thread (author-less); we resolve it
// with ensure_chapter_thread() for a top-level comment. A reply instead reuses
// the parent comment's thread so it lands in the same chapter discussion.
//
// RLS still does the real gating (username required, chapter unlocked, author =
// self); a trigger drops a reply notification into the recipient's inbox.
export async function addComment(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const bookId = String(formData.get("bookId") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Write something first." };
  if (body.length > 4000)
    return { ok: false, message: "That comment is too long." };

  // Figure out which thread this comment belongs to.
  let threadId: string;
  if (parentId) {
    // A reply: use the parent comment's thread so it stays in the same chapter.
    const { data: parent, error: parentErr } = await supabase
      .from("comments")
      .select("thread_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentErr || !parent) {
      return { ok: false, message: "Couldn't find the comment you're replying to." };
    }
    threadId = parent.thread_id;
  } else {
    // A top-level comment: find or create this chapter's implicit thread.
    if (!chapterId) return { ok: false, message: "Missing chapter." };
    const { data: tid, error: threadErr } = await supabase.rpc(
      "ensure_chapter_thread",
      { cid: chapterId },
    );
    if (threadErr || !tid) {
      return {
        ok: false,
        message:
          "Couldn't post that — make sure you've set a username and have read through this chapter.",
      };
    }
    threadId = tid;
  }

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

// Cast, change, or clear a vote on a comment. Voting again with the same
// direction toggles the vote off; voting the other way flips it. One row per
// (user, target) is guaranteed by the table's primary key.
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
