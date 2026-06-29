"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArt, reportArt } from "../books/actions";

export type GalleryArt = {
  id: string;
  image_url: string;
  title: string | null;
  artist_handle: string | null;
  credit_url: string | null;
  status: "pending" | "approved" | "rejected";
  // Optional: which chapter this piece belongs to. Only used when a grid mixes
  // pieces from several chapters (the "all unlocked art" view) so each tile can
  // wear a faint chapter badge.
  chapter_number?: number | null;
};

// Thumbnail grid for a chapter's art, with a tap-to-open viewer. Approved art
// shows to anyone who's reached the chapter; a reader's own not-yet-approved
// pieces show with a status badge so they can see their submission is in queue.
// Opening a piece launches a fullscreen viewer that flips between a carousel
// (one image at a time, prev/next arrows) and a gallery grid of the whole set.
// Moderators (isMod) get a delete control on each piece.
export function ArtGallery({
  art,
  bookId,
  isMod = false,
  showChapterBadge = false,
}: {
  art: GalleryArt[];
  bookId?: string;
  isMod?: boolean;
  // When true, each tile shows a faint chapter badge (for grids that mix
  // chapters, like "all unlocked art").
  showChapterBadge?: boolean;
}) {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  // Shared delete flow used by both the grid and the viewer. Confirms first,
  // then removes the row server-side (mods only) and refreshes the page.
  function removePiece(id: string, onDone?: () => void) {
    if (
      !window.confirm("Are you sure you want to delete this image?")
    )
      return;
    setPendingId(id);
    const fd = new FormData();
    fd.set("artworkId", id);
    if (bookId) fd.set("bookId", bookId);
    startDelete(async () => {
      try {
        await deleteArt(fd);
        onDone?.();
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {art.map((piece, i) => (
          <div key={piece.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="relative block aspect-square w-full overflow-hidden rounded-[10px]"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={piece.image_url}
                alt={piece.title ?? "Art"}
                className="h-full w-full object-cover"
              />
              {piece.status !== "approved" ? (
                <span
                  className="absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase"
                  style={{
                    background: "rgba(19,17,25,.82)",
                    color:
                      piece.status === "pending"
                        ? "var(--ember-soft)"
                        : "var(--wine-soft)",
                  }}
                >
                  {piece.status}
                </span>
              ) : null}
              {showChapterBadge && piece.chapter_number != null ? (
                <span
                  className="absolute right-1 bottom-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
                  style={{
                    background: "rgba(232,228,240,.08)",
                    color: "var(--muted-2)",
                  }}
                >
                  Ch. {piece.chapter_number}
                </span>
              ) : null}
            </button>
            {isMod ? (
              <button
                type="button"
                onClick={() => removePiece(piece.id)}
                disabled={pendingId === piece.id}
                aria-label="Delete this image"
                title="Delete this image"
                className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full disabled:opacity-50"
                style={{
                  background: "rgba(19,17,25,.86)",
                  border: "1px solid var(--line-2)",
                  color: "var(--wine-soft)",
                }}
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {openIndex !== null ? (
        <Viewer
          art={art}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          isMod={isMod}
          onDelete={(id) => removePiece(id, () => setOpenIndex(null))}
          deletingId={pendingId}
        />
      ) : null}
    </>
  );
}

function Viewer({
  art,
  index,
  onIndexChange,
  onClose,
  isMod = false,
  onDelete,
  deletingId,
}: {
  art: GalleryArt[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  isMod?: boolean;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
}) {
  const [view, setView] = useState<"carousel" | "gallery">("carousel");
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const count = art.length;
  const current = art[index];
  const go = (delta: number) => onIndexChange((index + delta + count) % count);

  // Reset the report flow whenever the image changes (adjust-during-render
  // pattern, so it happens before paint without an effect).
  const [prevIndex, setPrevIndex] = useState(index);
  if (index !== prevIndex) {
    setPrevIndex(index);
    setReporting(false);
    setReported(false);
  }

  // Keyboard: arrows page through the carousel, Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (view === "carousel" && e.key === "ArrowLeft") go(-1);
      else if (view === "carousel" && e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, index, count]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8,7,11,.86)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[var(--radius)]"
        style={{
          maxWidth: "min(94vw, 680px)",
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-2)",
        }}
      >
        {/* Toolbar: view toggle + counter + close (shown in both views) */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <button
            type="button"
            onClick={() =>
              setView((v) => (v === "carousel" ? "gallery" : "carousel"))
            }
            className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--silver)",
            }}
          >
            {view === "carousel" ? (
              <>
                <GridIcon />
                Gallery
              </>
            ) : (
              <>
                <ImageIcon />
                Carousel
              </>
            )}
          </button>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px]"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--silver)",
            }}
          >
            ✕
          </button>
        </div>

        {view === "gallery" ? (
          // Gallery view: every piece at once; tap one to view it big.
          <div className="overflow-y-auto p-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {art.map((piece, i) => (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => {
                    onIndexChange(i);
                    setView("carousel");
                  }}
                  className="relative block aspect-square overflow-hidden rounded-[8px]"
                  style={{
                    border:
                      i === index
                        ? "2px solid var(--ember)"
                        : "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={piece.image_url}
                    alt={piece.title ?? "Art"}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Carousel view: one image with prev/next arrows + details below.
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.image_url}
                alt={current.title ?? "Art"}
                className="max-h-[60vh] w-full object-contain"
                style={{ background: "var(--obsidian-3)" }}
              />
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

            <div className="flex flex-col gap-2 p-4">
              <div className="min-w-0">
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {current.title || "Untitled"}
                </p>
                {current.artist_handle ? (
                  <p
                    className="mt-0.5 text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    by {current.artist_handle}
                  </p>
                ) : null}
              </div>

              {current.credit_url ? (
                <a
                  href={current.credit_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[12.5px] underline"
                  style={{ color: "var(--ember-soft)" }}
                >
                  View source
                </a>
              ) : null}

              {reported ? (
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  Thanks — a moderator will take a look.
                </p>
              ) : reporting ? (
                <form
                  action={async (formData) => {
                    await reportArt(formData);
                    setReported(true);
                  }}
                  className="mt-1 flex flex-col gap-2"
                >
                  <input type="hidden" name="artworkId" value={current.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="What's wrong with this piece? (optional)"
                    autoComplete="off"
                    className="h-9 w-full rounded-[10px] px-2.5 text-[13px] outline-none"
                    style={{
                      border: "1px solid var(--line-2)",
                      background: "var(--obsidian-3)",
                      color: "var(--silver-bright)",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="h-8 rounded-full px-3.5 text-[12px] font-semibold"
                      style={{
                        border: "1px solid var(--line-2)",
                        background: "var(--obsidian-3)",
                        color: "var(--wine-soft)",
                      }}
                    >
                      Submit report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReporting(false)}
                      className="h-8 rounded-full px-3.5 text-[12px]"
                      style={{ color: "var(--muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setReporting(true)}
                  className="self-start text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  Report this art
                </button>
              )}

              {isMod && onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(current.id)}
                  disabled={deletingId === current.id}
                  className="mt-1 flex items-center gap-1.5 self-start text-[12px] font-semibold disabled:opacity-50"
                  style={{ color: "var(--wine-soft)" }}
                >
                  <TrashIcon />
                  {deletingId === current.id ? "Deleting…" : "Delete this image"}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
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

function GridIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
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

function ImageIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
