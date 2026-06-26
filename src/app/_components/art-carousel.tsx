"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArt } from "../books/actions";
import type { GalleryArt } from "./art-gallery";

// Inline "art" tab: one piece at a time with prev/next arrows and its details,
// shown directly on the page (not a modal). Moderators get a delete control.
// Approved art is visible to anyone who's reached the chapter; a reader's own
// pending/rejected pieces also show with a status badge.
export function ArtCarousel({
  art,
  bookId,
  isMod = false,
}: {
  art: GalleryArt[];
  bookId?: string;
  isMod?: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const count = art.length;
  // Keep the index in range if the set shrinks (e.g. after a delete).
  const safeIndex = Math.min(index, count - 1);
  const current = art[safeIndex];
  if (!current) return null;
  const go = (delta: number) => setIndex((safeIndex + delta + count) % count);

  function removePiece(id: string) {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    setDeletingId(id);
    const fd = new FormData();
    fd.set("artworkId", id);
    if (bookId) fd.set("bookId", bookId);
    startDelete(async () => {
      try {
        await deleteArt(fd);
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="mt-3">
      <div
        className="relative overflow-hidden rounded-[10px]"
        style={{ border: "1px solid var(--line-2)", background: "var(--obsidian-3)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.image_url}
          alt={current.title ?? "Art"}
          className="max-h-[60vh] w-full object-contain"
        />
        {current.status !== "approved" ? (
          <span
            className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
            style={{
              background: "rgba(19,17,25,.82)",
              color:
                current.status === "pending"
                  ? "var(--ember-soft)"
                  : "var(--wine-soft)",
            }}
          >
            {current.status}
          </span>
        ) : null}
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute top-1/2 left-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full"
              style={{
                background: "rgba(19,17,25,.78)",
                border: "1px solid var(--line-2)",
                color: "var(--silver-bright)",
              }}
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full"
              style={{
                background: "rgba(19,17,25,.78)",
                border: "1px solid var(--line-2)",
                color: "var(--silver-bright)",
              }}
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "var(--silver-bright)" }}
          >
            {current.title || "Untitled"}
          </p>
          {current.artist_handle ? (
            <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>
              by {current.artist_handle}
            </p>
          ) : null}
          {current.credit_url ? (
            <a
              href={current.credit_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-0.5 inline-block text-[12.5px] underline"
              style={{ color: "var(--ember-soft)" }}
            >
              View source
            </a>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px]" style={{ color: "var(--muted)" }}>
          {safeIndex + 1} / {count}
        </span>
      </div>

      {isMod ? (
        <button
          type="button"
          onClick={() => removePiece(current.id)}
          disabled={deletingId === current.id}
          className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold disabled:opacity-50"
          style={{ color: "var(--wine-soft)" }}
        >
          <TrashIcon />
          {deletingId === current.id ? "Deleting…" : "Delete this image"}
        </button>
      ) : null}
    </div>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
