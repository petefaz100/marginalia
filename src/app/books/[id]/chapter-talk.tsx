"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComment, castVote, deleteComment } from "./discussion-actions";

// A flat, per-chapter comment. parentId null = top-level; otherwise it's a reply
// to another comment (the stream stays one level deep). Comments for a chapter
// are gathered from that chapter's implicit discussion thread server-side.
export type ChapterComment = {
  id: string;
  parentId: string | null;
  body: string;
  author: string;
  createdAt: string;
  score: number;
  myVote: number; // -1, 0, or 1
};

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

// First letter of a @handle, for the round avatar chip.
function initial(name: string) {
  const c = name.replace(/^@/, "").trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}

function Caret({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="14"
      height="14"
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

// Composer for a top-level comment (chapterId set) or a reply (parentId set).
function Composer({
  bookId,
  chapterId,
  parentId,
  placeholder,
  onDone,
  compact = false,
}: {
  bookId: string;
  chapterId: string;
  parentId?: string;
  placeholder: string;
  onDone?: () => void;
  compact?: boolean;
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
    if (parentId) fd.set("parentId", parentId);
    else fd.set("chapterId", chapterId);
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
    <form onSubmit={submit} className={compact ? "mt-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
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
          {pending ? "Posting…" : parentId ? "Reply" : "Add comment"}
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

// A single comment row: avatar, @username · time, body, vote pill, and (for
// top-level comments) a reply control with its one level of nested replies.
function CommentRow({
  comment,
  replies,
  bookId,
  chapterId,
  chapterNumber,
  canPost,
  isMod = false,
  isReply = false,
}: {
  comment: ChapterComment;
  replies: ChapterComment[];
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  canPost: boolean;
  isMod?: boolean;
  isReply?: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [deleting, startDelete] = useTransition();

  function remove() {
    if (!window.confirm("Delete this comment? This can't be undone."))
      return;
    const fd = new FormData();
    fd.set("commentId", comment.id);
    fd.set("bookId", bookId);
    startDelete(async () => {
      await deleteComment(fd);
      router.refresh();
    });
  }

  return (
    <li className="flex gap-2.5">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--ember-soft)",
        }}
        aria-hidden
      >
        {initial(comment.author)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px]" style={{ color: "var(--muted)" }}>
          <span className="font-semibold" style={{ color: "var(--silver-bright)" }}>
            @{comment.author}
          </span>
          {" · "}
          {timeAgo(comment.createdAt)}
          {!isReply ? (
            <span
              className="ml-2 rounded-full px-1.5 py-0.5 text-[10.5px]"
              style={{ background: "var(--obsidian-3)", color: "var(--ember-soft)" }}
            >
              ch.{chapterNumber}
            </span>
          ) : null}
        </p>
        <p
          className="mt-0.5 text-[13.5px] whitespace-pre-wrap"
          style={{ color: "var(--silver-bright)" }}
        >
          {comment.body}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <VoteControlInline
            targetId={comment.id}
            score={comment.score}
            myVote={comment.myVote}
            bookId={bookId}
            canVote={canPost}
          />
          {canPost && !isReply ? (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="text-[12px] font-semibold"
              style={{ color: "var(--muted)" }}
            >
              {replying ? "Close" : "Reply"}
            </button>
          ) : null}
          {isMod ? (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="text-[12px] font-semibold disabled:opacity-50"
              style={{ color: "var(--wine-soft)" }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>

        {replying ? (
          <Composer
            bookId={bookId}
            chapterId={chapterId}
            parentId={comment.id}
            placeholder={`Reply to @${comment.author}…`}
            onDone={() => setReplying(false)}
            compact
          />
        ) : null}

        {replies.length > 0 ? (
          <ul
            className="mt-2.5 flex flex-col gap-2.5 pl-3"
            style={{ borderLeft: "1px solid var(--line)" }}
          >
            {replies.map((r) => (
              <CommentRow
                key={r.id}
                comment={r}
                replies={[]}
                bookId={bookId}
                chapterId={chapterId}
                chapterNumber={chapterNumber}
                canPost={canPost}
                isMod={isMod}
                isReply
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

// Horizontal vote control (used under each comment body, prototype-style): an
// up caret, the score, a down caret, laid out in a row.
function VoteControlInline({
  targetId,
  score,
  myVote,
  bookId,
  canVote,
}: {
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
      await castVote("comment", targetId, value, bookId);
      router.refresh();
    });
  }

  return (
    <span className="flex items-center gap-1">
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
        className="min-w-[14px] text-center font-mono text-[12px] font-semibold"
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
    </span>
  );
}

// The "talk" tab for one chapter: a DISCUSSION (n) header, an always-present
// composer for signed-in readers with a username, then the flat comment stream
// with one level of replies. Comments are already spoiler-gated server-side.
export function ChapterTalk({
  bookId,
  chapterId,
  chapterNumber,
  comments,
  signedIn,
  hasUsername,
  isMod = false,
}: {
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  comments: ChapterComment[];
  signedIn: boolean;
  hasUsername: boolean;
  isMod?: boolean;
}) {
  const canPost = signedIn && hasUsername;
  const topLevel = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <div className="mt-3">
      <p
        className="text-[11px] tracking-[.14em] uppercase"
        style={{ color: "var(--violet-soft)" }}
      >
        Discussion ({comments.length})
      </p>

      {canPost ? (
        <div className="mt-2">
          <Composer
            bookId={bookId}
            chapterId={chapterId}
            placeholder="Add a comment…"
          />
        </div>
      ) : signedIn ? (
        <div
          className="mt-2 rounded-[var(--radius-sm)] p-3"
          style={{
            border: "1px solid var(--ember)",
            background: "rgba(224,104,63,.10)",
          }}
        >
          <p className="text-[13px]" style={{ color: "var(--silver)" }}>
            Choose a public username before you can comment.
          </p>
          <Link
            href="/account"
            className="mt-1 inline-block text-[12.5px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
          >
            Set username →
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
          Sign in to join the discussion for this chapter.
        </p>
      )}

      {topLevel.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {topLevel.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              replies={repliesOf(c.id)}
              bookId={bookId}
              chapterId={chapterId}
              chapterNumber={chapterNumber}
              canPost={canPost}
              isMod={isMod}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
          No comments yet — be the first to talk about this chapter.
        </p>
      )}
    </div>
  );
}
