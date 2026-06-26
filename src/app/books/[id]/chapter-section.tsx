"use client";

import { useState } from "react";
import { setReadThrough } from "../actions";
import { ArtGallery, type GalleryArt } from "../../_components/art-gallery";

type Chapter = { id: string; number: number; title: string | null };

function LockIcon() {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// The chapters area of a book page, with two ways to look at the art:
//   • Chapter View — the usual list, art grouped under each unlocked chapter.
//   • Gallery View — every unlocked piece in one grid.
// Each chapter row carries a far-left "mark read" control: tap it to set your
// reading position to that chapter (revealing its art); tap a read one to step
// back. This replaces the old row of chapter pills.
export function ChapterSection({
  bookId,
  chapters,
  readThrough,
  artByChapter,
  signedIn,
}: {
  bookId: string;
  chapters: Chapter[];
  readThrough: number;
  artByChapter: Record<string, GalleryArt[]>;
  signedIn: boolean;
}) {
  const [view, setView] = useState<"chapter" | "gallery">("chapter");

  if (chapters.length === 0) {
    return (
      <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
        No chapters yet.
      </p>
    );
  }

  const firstLockedIndex = chapters.findIndex((c) => c.number > readThrough);

  // Everything the reader is allowed to see, flattened for Gallery View.
  const unlockedArt: GalleryArt[] = chapters
    .filter((c) => c.number <= readThrough)
    .flatMap((c) => artByChapter[c.id] ?? []);

  return (
    <>
      {/* View toggle */}
      <div className="mb-3 flex gap-2">
        {(
          [
            ["chapter", "Chapter View"],
            ["gallery", "Gallery View"],
          ] as const
        ).map(([key, label]) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className="h-8 rounded-full px-3.5 text-[12.5px] font-semibold"
              style={
                active
                  ? { background: "var(--ember)", color: "#fff" }
                  : {
                      border: "1px solid var(--line)",
                      background: "var(--obsidian-2)",
                      color: "var(--silver)",
                    }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {view === "gallery" ? (
        unlockedArt.length > 0 ? (
          <ArtGallery art={unlockedArt} />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            {readThrough > 0
              ? "No art in the chapters you've unlocked yet."
              : "Mark a chapter read to start revealing art."}
          </p>
        )
      ) : (
        <ul className="flex flex-col gap-2.5">
          {chapters.map((ch, i) => {
            const unlocked = ch.number <= readThrough;
            const chapterArt = artByChapter[ch.id] ?? [];
            const count = chapterArt.length;
            return (
              <li key={ch.id}>
                {i === firstLockedIndex ? (
                  <div
                    className="mb-2.5 flex items-center gap-2 text-[11px] tracking-[.14em] uppercase"
                    style={{ color: "var(--wine-soft)" }}
                  >
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--line-2)" }}
                    />
                    spoilers beyond here
                    <span
                      className="h-px flex-1"
                      style={{ background: "var(--line-2)" }}
                    />
                  </div>
                ) : null}
                <div
                  className="rounded-[var(--radius-sm)] p-3.5"
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--obsidian-2)",
                    opacity: unlocked ? 1 : 0.7,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Far-left mark-read control */}
                    {signedIn ? (
                      <form action={setReadThrough} className="shrink-0">
                        <input type="hidden" name="bookId" value={bookId} />
                        <input
                          type="hidden"
                          name="through"
                          value={unlocked ? ch.number - 1 : ch.number}
                        />
                        <button
                          type="submit"
                          aria-label={
                            unlocked
                              ? `Mark chapter ${ch.number} unread`
                              : `Mark chapter ${ch.number} read`
                          }
                          title={unlocked ? "Mark unread" : "Mark this read"}
                          className="grid h-8 w-8 place-items-center rounded-full text-[14px]"
                          style={
                            unlocked
                              ? { background: "var(--ember)", color: "#fff" }
                              : {
                                  border: "1px solid var(--line-2)",
                                  background: "var(--obsidian-3)",
                                  color: "var(--muted)",
                                }
                          }
                        >
                          {unlocked ? "✓" : ""}
                        </button>
                      </form>
                    ) : null}

                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold"
                      style={{
                        border: "1px solid var(--line-2)",
                        background: "var(--obsidian-3)",
                        color: unlocked
                          ? "var(--ember-soft)"
                          : "var(--muted-2)",
                      }}
                    >
                      {ch.number}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-[14px] font-semibold"
                      style={{ color: "var(--silver-bright)" }}
                    >
                      {ch.title || `Chapter ${ch.number}`}
                    </span>
                    {unlocked ? (
                      <span
                        className="shrink-0 text-[12px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {count > 0
                          ? `${count} ${count === 1 ? "piece" : "pieces"}`
                          : "No art yet"}
                      </span>
                    ) : (
                      <span
                        className="flex shrink-0 items-center gap-1.5 text-[12px]"
                        style={{ color: "var(--muted-2)" }}
                      >
                        <LockIcon />
                        Locked
                      </span>
                    )}
                  </div>

                  {unlocked && count > 0 ? (
                    <ArtGallery art={chapterArt} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
