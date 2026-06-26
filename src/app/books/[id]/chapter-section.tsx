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

// The chapters area of a book page. Three controls sit on top:
//   • Progress selector — set how far you've read; everything at or below that
//     chapter unlocks. Always visible, so it works in either view below.
//   • Search — filter unlocked art by title or artist (spoiler-safe: it never
//     reaches art from chapters you haven't read).
//   • View toggle — Chapter View (art grouped under each chapter, with a
//     far-left mark-read control) or Gallery View (every unlocked piece in one
//     grid). Rejected art is deleted server-side, so it never appears here.
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
  const [query, setQuery] = useState("");

  if (chapters.length === 0) {
    return (
      <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
        No chapters yet.
      </p>
    );
  }

  const firstLockedIndex = chapters.findIndex((c) => c.number > readThrough);

  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const matches = (p: GalleryArt) =>
    !searching ||
    (p.title?.toLowerCase().includes(q) ?? false) ||
    (p.artist_handle?.toLowerCase().includes(q) ?? false);

  const unlockedChapters = chapters.filter((c) => c.number <= readThrough);

  // Everything the reader is allowed to see, flattened for Gallery View.
  const unlockedArt: GalleryArt[] = unlockedChapters.flatMap(
    (c) => artByChapter[c.id] ?? [],
  );
  const galleryArt = unlockedArt.filter(matches);

  // Chapters that still have art after the search filter (Chapter View).
  const matchedChapters = unlockedChapters
    .map((c) => ({ chapter: c, art: (artByChapter[c.id] ?? []).filter(matches) }))
    .filter((x) => x.art.length > 0);

  return (
    <>
      {/* Progress selector — works for both views */}
      {signedIn ? (
        <form
          action={setReadThrough}
          className="mb-3 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
          }}
        >
          <input type="hidden" name="bookId" value={bookId} />
          <label
            className="shrink-0 text-[12px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
            htmlFor="read-through"
          >
            Read through
          </label>
          <select
            id="read-through"
            name="through"
            defaultValue={readThrough}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="h-8 min-w-0 flex-1 rounded-[8px] px-2 text-[13px] outline-none"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--silver-bright)",
            }}
          >
            <option value={0}>Not started — hide all art</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.number}>
                Ch. {c.number}
                {c.title ? ` · ${c.title}` : ""}
              </option>
            ))}
          </select>
        </form>
      ) : null}

      {/* Search */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search this book's art by title or artist…"
        autoComplete="off"
        className="mb-3 h-10 w-full rounded-[var(--radius-sm)] px-3 text-[13.5px] outline-none"
        style={{
          border: "1px solid var(--line)",
          background: "var(--obsidian-2)",
          color: "var(--silver-bright)",
        }}
      />

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
        galleryArt.length > 0 ? (
          <ArtGallery art={galleryArt} />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            {searching
              ? "No unlocked art matches your search."
              : readThrough > 0
                ? "No art in the chapters you've unlocked yet."
                : "Mark a chapter read to start revealing art."}
          </p>
        )
      ) : searching ? (
        // Chapter View, filtered by search: only chapters with matches.
        matchedChapters.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {matchedChapters.map(({ chapter: ch, art }) => (
              <li key={ch.id}>
                <div
                  className="rounded-[var(--radius-sm)] p-3.5"
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--obsidian-2)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold"
                      style={{
                        border: "1px solid var(--line-2)",
                        background: "var(--obsidian-3)",
                        color: "var(--ember-soft)",
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
                    <span
                      className="shrink-0 text-[12px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {art.length} {art.length === 1 ? "match" : "matches"}
                    </span>
                  </div>
                  <ArtGallery art={art} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            No unlocked art matches your search.
          </p>
        )
      ) : (
        // Chapter View, full list with mark-read controls + spoiler gate.
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
