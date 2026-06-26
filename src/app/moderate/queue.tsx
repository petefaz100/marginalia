"use client";

import { useState, useTransition } from "react";
import { moderateArt } from "./actions";

export type QueueItem = {
  id: string;
  bookId: string;
  imageUrl: string;
  title: string | null;
  artistHandle: string | null;
  creditUrl: string | null;
  bookTitle: string;
  chapterLabel: string;
  uploader: string;
};

// Default rejection reasons a mod can pick. The chosen one (plus an optional
// note) is stored on the notification so the uploader learns why.
const REJECT_REASONS = [
  "Spoiler — tagged to the wrong chapter",
  "Doesn't match this book or chapter",
  "Low image quality or too small",
  "Missing source or artist credit",
  "Duplicate of art already posted",
  "Inappropriate or off-topic",
  "Other (see note)",
];

export function ModerationQueue({ items }: { items: QueueItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // When set, we're choosing a rejection reason for these artwork ids.
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState("");

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  function bookIdsFor(ids: string[]) {
    return items.filter((i) => ids.includes(i.id)).map((i) => i.bookId);
  }

  function approve(ids: string[]) {
    if (ids.length === 0) return;
    startTransition(async () => {
      await moderateArt(ids, "approved", bookIdsFor(ids));
      setSelected(new Set());
    });
  }

  function confirmReject() {
    const ids = rejecting;
    if (!ids || ids.length === 0) return;
    startTransition(async () => {
      await moderateArt(ids, "rejected", bookIdsFor(ids), reason, note);
      setSelected(new Set());
      setRejecting(null);
      setNote("");
      setReason(REJECT_REASONS[0]);
    });
  }

  if (items.length === 0) return null;

  const selectedIds = [...selected];
  const rejectCount = rejecting?.length ?? 0;

  return (
    <>
      {/* Bulk action bar */}
      <div
        className="sticky top-[68px] z-30 mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5"
        style={{
          border: "1px solid var(--line)",
          background: "var(--obsidian-2)",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          type="button"
          onClick={toggleAll}
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--silver)" }}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
        <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
          {selected.size > 0 ? `${selected.size} selected` : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => approve(selectedIds)}
            className="h-8 rounded-full px-3.5 text-[12px] font-semibold disabled:opacity-40"
            style={{ background: "var(--ember)", color: "#fff" }}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => setRejecting(selectedIds)}
            className="h-8 rounded-full px-3.5 text-[12px] font-semibold disabled:opacity-40"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--wine-soft)",
            }}
          >
            Reject
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-4">
        {items.map((art) => {
          const isSel = selected.has(art.id);
          return (
            <li
              key={art.id}
              className="overflow-hidden rounded-[var(--radius-sm)]"
              style={{
                border: `1px solid ${isSel ? "var(--ember)" : "var(--line)"}`,
                background: "var(--obsidian-2)",
              }}
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={art.imageUrl}
                  alt={art.title ?? "Submitted art"}
                  className="max-h-[420px] w-full object-contain"
                  style={{ background: "var(--obsidian-3)" }}
                />
                <label
                  className="absolute top-2.5 left-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                  style={{
                    background: isSel ? "var(--ember)" : "rgba(19,17,25,.82)",
                    border: "1px solid var(--line-2)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(art.id)}
                    className="sr-only"
                  />
                  <span className="text-[14px] text-white">
                    {isSel ? "✓" : ""}
                  </span>
                </label>
              </div>
              <div className="p-3.5">
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {art.title || "Untitled"}
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {art.bookTitle} · {art.chapterLabel}
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  Submitted by {art.uploader}
                  {art.artistHandle ? ` · artist: ${art.artistHandle}` : ""}
                </p>
                {art.creditUrl ? (
                  <a
                    href={art.creditUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-0.5 inline-block text-[12.5px] underline"
                    style={{ color: "var(--ember-soft)" }}
                  >
                    Source link
                  </a>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => approve([art.id])}
                    className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                    style={{ background: "var(--ember)", color: "#fff" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setRejecting([art.id])}
                    className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                    style={{
                      border: "1px solid var(--line-2)",
                      background: "var(--obsidian-3)",
                      color: "var(--wine-soft)",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Rejection reason chooser */}
      {rejecting ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ background: "rgba(8,7,11,.72)" }}
          onClick={() => !pending && setRejecting(null)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-[var(--radius)] p-4 sm:rounded-[var(--radius)]"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-[11px] tracking-[.14em] uppercase"
              style={{ color: "var(--wine-soft)" }}
            >
              Reject {rejectCount} {rejectCount === 1 ? "piece" : "pieces"}
            </p>
            <p
              className="mt-1 mb-3 text-[12.5px]"
              style={{ color: "var(--muted)" }}
            >
              The uploader gets this reason in their inbox.
            </p>

            <label className="flex flex-col gap-1">
              <span className="text-[12px]" style={{ color: "var(--silver)" }}>
                Reason
              </span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: "var(--silver-bright)",
                }}
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 flex flex-col gap-1">
              <span className="text-[12px]" style={{ color: "var(--silver)" }}>
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add anything that helps the uploader fix it."
                className="w-full resize-none rounded-[10px] px-2.5 py-2 text-[14px] outline-none"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: "var(--silver-bright)",
                }}
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setRejecting(null)}
                className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: "var(--silver)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmReject}
                className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                style={{ background: "var(--wine)", color: "#fff" }}
              >
                {pending ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
