"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { VoteTarget } from "@/lib/supabase/types";
import { addComment, castVote, createThread } from "./discussion-actions";

export type DiscComment = {
  id: string;
  parentId: string | null;
  body: string;
  author: string;
  createdAt: string;
  score: number;
  myVote: number; // -1, 0, or 1
};

export type DiscThread = {
  id: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  title: string;
  body: string | null;
  author: string;
  createdAt: string;
  score: number;
  myVote: number;
  comments: DiscComment[];
};

type Chapter = { id: string; number: number; title: string | null };

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Up/down vote pill shared by threads and comments. Highlights the reader's own
// current vote; clicking the active direction again clears it.
function VoteControl({
  targetType,
  targetId,
  score,
  myVote,
  bookId,
  canVote,
}: {
  targetType: VoteTarget;
  targetId: string;
  score: number;
  myVote: number;
  bookId: string;
  canVote: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function vote(value: 1 | -1) {
    if (!canVote || pending) return;
    start(async () => {
      await castVote(targetType, targetId, value, bookId);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={!canVote || pending}
        aria-label="Upvote"
        className="grid h-6 w-6 place-items-center rounded-[7px] disabled:opacity-50"
        style={{
          color: myVote === 1 ? "var(--ember)" : "var(--muted)",
          background: myVote === 1 ? "rgba(224,104,63,.12)" : "transparent",
        }}
      >
        <Caret dir="up" />
      </button>
      <span
        className="font-mono text-[12px] font-semibold"
        style={{
          color:
            myVote === 1
              ? "var(--ember)"
              : myVote === -1
                ? "var(--violet-soft)"
                : "var(--silver)",
        }}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={!canVote || pending}
        aria-label="Downvote"
        className="grid h-6 w-6 place-items-center rounded-[7px] disabled:opacity-50"
        style={{
          color: myVote === -1 ? "var(--violet-soft)" : "var(--muted)",
          background: myVote === -1 ? "rgba(159,140,224,.12)" : "transparent",
        }}
      >
        <Caret dir="down" />
      </button>
    </div>
  );
}

// A small reply/comment composer. Used for top-level comments on a thread and
// for one-level replies to a comment.
function CommentComposer({
  bookId,
  threadId,
  parentId,
  placeholder,
  onDone,
}: {
  bookId: string;
  threadId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    const fd = new FormData();
    fd.set("bookId", bookId);
    fd.set("threadId", threadId);
    if (parentId) fd.set("parentId", parentId);
    fd.set("body", body);
    start(async () => {
      const res = await addComment(fd);
      if (res.ok) {
        setBody("");
        setError(null);
        onDone?.();
        router.refresh();
      } else {
        setError(res.message ?? "Couldn't post that.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-y rounded-[10px] px-2.5 py-2 text-[13px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />
      {error ? (
        <p className="text-[12px]" style={{ color: "var(--wine-soft)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!body.trim() || pending}
          className="h-8 rounded-full px-3.5 text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          {pending ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="h-8 rounded-full px-3 text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

// A single comment with its one level of replies. Reply control only shows on
// top-level comments, so the tree never nests deeper than one level.
function CommentItem({
  comment,
  replies,
  bookId,
  threadId,
  canPost,
}: {
  comment: DiscComment;
  replies: DiscComment[];
  bookId: string;
  threadId: string;
  canPost: boolean;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li>
      <div className="flex gap-2.5">
        <VoteControl
          targetType="comment"
          targetId={comment.id}
          score={comment.score}
          myVote={comment.myVote}
          bookId={bookId}
          canVote={canPost}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>
            <span style={{ color: "var(--silver)" }}>{comment.author}</span>
            {" · "}
            {timeAgo(comment.createdAt)}
          </p>
          <p
            className="mt-0.5 text-[13.5px] whitespace-pre-wrap"
            style={{ color: "var(--silver-bright)" }}
          >
            {comment.body}
          </p>
          {canPost ? (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="mt-1 text-[12px] font-semibold"
              style={{ color: "var(--muted)" }}
            >
              {replying ? "Close" : "Reply"}
            </button>
          ) : null}
          {replying ? (
            <CommentComposer
              bookId={bookId}
              threadId={threadId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.author}…`}
              onDone={() => setReplying(false)}
            />
          ) : null}

          {replies.length > 0 ? (
            <ul
              className="mt-2 flex flex-col gap-2 pl-3"
              style={{ borderLeft: "1px solid var(--line)" }}
            >
              {replies.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <VoteControl
                    targetType="comment"
                    targetId={r.id}
                    score={r.score}
                    myVote={r.myVote}
                    bookId={bookId}
                    canVote={canPost}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                      <span style={{ color: "var(--silver)" }}>{r.author}</span>
                      {" · "}
                      {timeAgo(r.createdAt)}
                    </p>
                    <p
                      className="mt-0.5 text-[13.5px] whitespace-pre-wrap"
                      style={{ color: "var(--silver-bright)" }}
                    >
                      {r.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ThreadCard({
  thread,
  bookId,
  canPost,
}: {
  thread: DiscThread;
  bookId: string;
  canPost: boolean;
}) {
  const [open, setOpen] = useState(false);

  const topLevel = thread.comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) =>
    thread.comments.filter((c) => c.parentId === id);
  const count = thread.comments.length;

  return (
    <li
      className="rounded-[var(--radius-sm)] p-3.5"
      style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
    >
      <div className="flex gap-3">
        <VoteControl
          targetType="thread"
          targetId={thread.id}
          score={thread.score}
          myVote={thread.myVote}
          bookId={bookId}
          canVote={canPost}
        />
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] tracking-[.12em] uppercase"
            style={{ color: "var(--ember-soft)" }}
          >
            Ch. {thread.chapterNumber}
            {thread.chapterTitle ? ` · ${thread.chapterTitle}` : ""}
          </p>
          <h4
            className="mt-1 text-[15px] font-semibold"
            style={{ color: "var(--silver-bright)" }}
          >
            {thread.title}
          </h4>
          {thread.body ? (
            <p
              className="mt-1 text-[13.5px] whitespace-pre-wrap"
              style={{ color: "var(--silver)" }}
            >
              {thread.body}
            </p>
          ) : null}
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
            {thread.author} · {timeAgo(thread.createdAt)}
          </p>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 text-[12.5px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
          >
            {open
              ? "Hide comments"
              : count > 0
                ? `${count} ${count === 1 ? "comment" : "comments"}`
                : "Comment"}
          </button>

          {open ? (
            <div className="mt-2">
              {topLevel.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {topLevel.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      replies={repliesOf(c.id)}
                      bookId={bookId}
                      threadId={thread.id}
                      canPost={canPost}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                  No comments yet.
                </p>
              )}
              {canPost ? (
                <CommentComposer
                  bookId={bookId}
                  threadId={thread.id}
                  placeholder="Add a comment…"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

// New-thread composer: pick an unlocked chapter, give a title, optional body.
function NewThread({
  bookId,
  chapters,
}: {
  bookId: string;
  chapters: Chapter[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("bookId", bookId);
    const form = e.currentTarget;
    start(async () => {
      const res = await createThread(fd);
      if (res.ok) {
        setError(null);
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        setError(res.message ?? "Couldn't post that.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 h-10 rounded-full px-4 text-[13px] font-semibold"
        style={{ background: "var(--ember)", color: "#fff" }}
      >
        Start a thread
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 flex flex-col gap-2.5 rounded-[var(--radius-sm)] p-3.5"
      style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-[12px]" style={{ color: "var(--silver)" }}>
          Chapter (sets the spoiler level)
        </span>
        <select
          name="chapterId"
          required
          defaultValue={chapters[chapters.length - 1]?.id ?? ""}
          className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
          style={{
            border: "1px solid var(--line-2)",
            background: "var(--obsidian-3)",
            color: "var(--silver-bright)",
          }}
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title ? `Ch. ${c.number} · ${c.title}` : `Chapter ${c.number}`}
            </option>
          ))}
        </select>
      </label>
      <input
        type="text"
        name="title"
        placeholder="Thread title"
        autoComplete="off"
        maxLength={140}
        required
        className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />
      <textarea
        name="body"
        placeholder="Say more (optional)…"
        rows={3}
        className="w-full resize-y rounded-[10px] px-2.5 py-2 text-[13.5px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />
      {error ? (
        <p className="text-[12.5px]" style={{ color: "var(--wine-soft)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-full px-4 text-[13px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          {pending ? "Posting…" : "Post thread"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 rounded-full px-3 text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// The discussion area on a book page. Only chapters the reader has unlocked are
// passed in (and RLS gates the threads too), so future-chapter talk stays
// hidden. Posting needs a signed-in reader who has chosen a public username.
export function DiscussionPanel({
  bookId,
  unlockedChapters,
  threads,
  signedIn,
  hasUsername,
}: {
  bookId: string;
  unlockedChapters: Chapter[];
  threads: DiscThread[];
  signedIn: boolean;
  hasUsername: boolean;
}) {
  const canPost = signedIn && hasUsername;

  if (!signedIn) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted)" }}>
        Sign in and mark a chapter read to join the discussion — talk for a
        chapter stays hidden until you&apos;ve reached it.
      </p>
    );
  }

  if (unlockedChapters.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted)" }}>
        Mark a chapter read to unlock its discussion. Threads stay hidden until
        you&apos;ve reached the chapter they belong to.
      </p>
    );
  }

  return (
    <>
      {canPost ? (
        <NewThread bookId={bookId} chapters={unlockedChapters} />
      ) : (
        <div
          className="mb-4 rounded-[var(--radius-sm)] p-3.5"
          style={{
            border: "1px solid var(--ember)",
            background: "rgba(224,104,63,.10)",
          }}
        >
          <p className="text-[13px]" style={{ color: "var(--silver)" }}>
            Choose a public username before you can post or comment.
          </p>
          <Link
            href="/account"
            className="mt-1 inline-block text-[12.5px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
          >
            Set username →
          </Link>
        </div>
      )}

      {threads.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {threads.map((t) => (
            <ThreadCard
              key={t.id}
              thread={t}
              bookId={bookId}
              canPost={canPost}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          No threads yet for the chapters you&apos;ve unlocked. Start one above.
        </p>
      )}
    </>
  );
}

function Caret({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "up" ? (
        <polyline points="6 15 12 9 18 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}
