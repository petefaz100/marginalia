"use client";

import { useState } from "react";
import { reportArt } from "../books/actions";

export type GalleryArt = {
  id: string;
  image_url: string;
  title: string | null;
  artist_handle: string | null;
  credit_url: string | null;
  status: "pending" | "approved" | "rejected";
};

// Thumbnail grid for a chapter's art, with a tap-to-open lightbox. Approved art
// shows to anyone who's reached the chapter; a reader's own not-yet-approved
// pieces show with a status badge so they can see their submission is in queue.
export function ArtGallery({ art }: { art: GalleryArt[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? art[openIndex] : null;

  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {art.map((piece, i) => (
          <button
            key={piece.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative block aspect-square overflow-hidden rounded-[10px]"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={piece.image_url}
              alt={piece.title ?? "Fan art"}
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
          </button>
        ))}
      </div>

      {open ? (
        <Lightbox art={open} onClose={() => setOpenIndex(null)} />
      ) : null}
    </>
  );
}

function Lightbox({
  art,
  onClose,
}: {
  art: GalleryArt;
  onClose: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

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
          maxWidth: "min(92vw, 520px)",
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-2)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art.image_url}
          alt={art.title ?? "Fan art"}
          className="max-h-[60vh] w-full object-contain"
          style={{ background: "var(--obsidian-3)" }}
        />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                {art.title || "Untitled"}
              </p>
              {art.artist_handle ? (
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  by {art.artist_handle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[16px]"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver)",
              }}
            >
              ✕
            </button>
          </div>

          {art.credit_url ? (
            <a
              href={art.credit_url}
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
              <input type="hidden" name="artworkId" value={art.id} />
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
        </div>
      </div>
    </div>
  );
}
