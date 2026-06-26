"use client";

import { useState } from "react";
import { setReadThrough } from "../actions";
import { ArtGallery, type GalleryArt } from "../../_components/art-gallery";
import { ArtCarousel } from "../../_components/art-carousel";
import { ChapterTalk, type ChapterComment } from "./chapter-talk";

type Chapter = { id: string; number: number; title: string | null };
type TabKey = "art" | "gallery" | "talk";

function FrameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function TalkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

// A one-click mark-read form. `through` is the reading position it sets when
// pressed (so the same control can mark a chapter read, or un-read).
function MarkReadButton({
  bookId,
  through,
  label,
  filled,
}: {
  bookId: string;
  through: number;
  label: string;
  filled: boolean;
}) {
  return (
    <form action={setReadThrough} className="shrink-0">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="through" value={through} />
      <button
        type="submit"
        className="flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold"
        style={
          filled
            ? { background: "var(--ember)", color: "#fff" }
            : {
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver)",
              }
        }
      >
        {label}
      </button>
    </form>
  );
}

// The chapters area of a book page. Instead of listing every chapter (painful at
// 80+), it focuses on ONE chapter at a time — chosen with a small number picker —
// and shows its Art / Gallery / Talk. A "Show all art so far" checkbox switches
// to a single gallery of every piece across the chapters you've unlocked. The
// spoiler gate is enforced server-side (RLS); this is just presentation.
export function ChapterSection({
  bookId,
  chapters,
  readThrough,
  artByChapter,
  commentsByChapter,
  signedIn,
  hasUsername = false,
  isMod = false,
}: {
  bookId: string;
  chapters: Chapter[];
  readThrough: number;
  artByChapter: Record<string, GalleryArt[]>;
  commentsByChapter: Record<string, ChapterComment[]>;
  signedIn: boolean;
  hasUsername?: boolean;
  isMod?: boolean;
}) {
  const total = chapters.length;
  const initialFocus = readThrough >= 1 ? readThrough : 1;
  const initialChapter = chapters.find((c) => c.number === initialFocus);
  const initialHasArt =
    !!initialChapter && (artByChapter[initialChapter.id]?.length ?? 0) > 0;

  const [focus, setFocus] = useState(initialFocus);
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState<TabKey>(initialHasArt ? "art" : "talk");
  const [query, setQuery] = useState("");

  if (total === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted)" }}>
        No chapters yet.
        {signedIn ? " Use “Contribute” below to add the first one." : ""}
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-[13px]" style={{ color: "var(--muted)" }}>
        Sign in to track your place — a chapter&apos;s art and discussion unlock
        once you mark it read, so nothing ahead gets spoiled.
      </p>
    );
  }

  // Clamp the picker to a real chapter.
  const focusNum = Math.min(Math.max(focus, 1), total);
  const focused = chapters.find((c) => c.number === focusNum) ?? chapters[0];
  const unlocked = focused.number <= readThrough;
  const focusedArt = artByChapter[focused.id] ?? [];
  const focusedComments = commentsByChapter[focused.id] ?? [];

  // Everything unlocked, flattened, for the "show all art" gallery + search.
  const unlockedChapters = chapters.filter((c) => c.number <= readThrough);
  const allReadArt: GalleryArt[] = unlockedChapters.flatMap(
    (c) => artByChapter[c.id] ?? [],
  );
  const q = query.trim().toLowerCase();
  const filteredAll = !q
    ? allReadArt
    : allReadArt.filter(
        (p) =>
          (p.title?.toLowerCase().includes(q) ?? false) ||
          (p.artist_handle?.toLowerCase().includes(q) ?? false),
      );

  return (
    <>
      {/* Position line */}
      <p className="mb-2 text-[13px]" style={{ color: "var(--muted)" }}>
        {readThrough > 0 ? (
          <>
            You&apos;re on{" "}
            <span style={{ color: "var(--silver-bright)" }}>
              chapter {readThrough}
            </span>{" "}
            of {total}.
          </>
        ) : (
          "You haven't started yet — mark chapter 1 read to reveal its art and discussion."
        )}
      </p>

      {/* Picker + show-all checkbox */}
      <div
        className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-sm)] px-3 py-2.5"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
          >
            Chapter
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFocus(focusNum - 1)}
              disabled={showAll || focusNum <= 1}
              aria-label="Previous chapter"
              className="grid h-8 w-8 place-items-center rounded-[8px] disabled:opacity-40"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver)",
              }}
            >
              <Arrow dir="left" />
            </button>
            <input
              type="number"
              min={1}
              max={total}
              value={focusNum}
              disabled={showAll}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) setFocus(Math.min(Math.max(n, 1), total));
              }}
              aria-label="Chapter number"
              className="h-8 w-14 rounded-[8px] px-2 text-center text-[13px] outline-none disabled:opacity-40"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver-bright)",
              }}
            />
            <button
              type="button"
              onClick={() => setFocus(focusNum + 1)}
              disabled={showAll || focusNum >= total}
              aria-label="Next chapter"
              className="grid h-8 w-8 place-items-center rounded-[8px] disabled:opacity-40"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver)",
              }}
            >
              <Arrow dir="right" />
            </button>
          </div>
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            of {total}
          </span>
        </div>

        <label
          className="flex cursor-pointer items-center gap-2 text-[12.5px]"
          style={{ color: "var(--silver)" }}
        >
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="h-4 w-4 accent-[var(--ember)]"
          />
          Show all art so far
        </label>
      </div>

      {showAll ? (
        // Combined gallery across every unlocked chapter.
        unlockedChapters.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Mark a chapter read to start revealing art.
          </p>
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your unlocked art by title or artist…"
              autoComplete="off"
              className="mb-3 h-10 w-full rounded-[var(--radius-sm)] px-3 text-[13.5px] outline-none"
              style={{
                border: "1px solid var(--line)",
                background: "var(--obsidian-2)",
                color: "var(--silver-bright)",
              }}
            />
            {filteredAll.length > 0 ? (
              <ArtGallery art={filteredAll} bookId={bookId} isMod={isMod} />
            ) : (
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                {q
                  ? "No unlocked art matches your search."
                  : "No art in the chapters you've unlocked yet."}
              </p>
            )}
          </>
        )
      ) : (
        // Focused single-chapter view.
        <div
          className="rounded-[var(--radius-sm)] p-3.5"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            opacity: unlocked ? 1 : 0.85,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: unlocked ? "var(--ember-soft)" : "var(--muted-2)",
              }}
            >
              {focused.number}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-[15px] font-semibold"
              style={{ color: "var(--silver-bright)" }}
            >
              {focused.title || `Chapter ${focused.number}`}
            </span>
            {unlocked ? (
              <MarkReadButton
                bookId={bookId}
                through={focused.number - 1}
                label="✓ Read"
                filled
              />
            ) : (
              <MarkReadButton
                bookId={bookId}
                through={focused.number}
                label={`Mark ch. ${focused.number} read`}
                filled={false}
              />
            )}
          </div>

          {unlocked ? (
            <>
              {/* Tabs */}
              <div className="mt-3 flex gap-2">
                {(
                  [
                    ["art", "Art", <FrameIcon key="f" />],
                    ["gallery", "Gallery", <GridIcon key="g" />],
                    ["talk", "Talk", <TalkIcon key="t" />],
                  ] as const
                ).map(([key, label, icon]) => {
                  const active = tab === key;
                  const badge =
                    key === "talk" ? focusedComments.length : focusedArt.length;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold"
                      style={
                        active
                          ? { background: "var(--ember)", color: "#fff" }
                          : {
                              border: "1px solid var(--line)",
                              background: "var(--obsidian-3)",
                              color: "var(--silver)",
                            }
                      }
                    >
                      {icon}
                      {label}
                      {badge > 0 ? (
                        <span style={{ opacity: 0.8 }}>· {badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {tab === "art" ? (
                focusedArt.length > 0 ? (
                  <ArtCarousel art={focusedArt} bookId={bookId} isMod={isMod} />
                ) : (
                  <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                    No art yet for this chapter.
                  </p>
                )
              ) : tab === "gallery" ? (
                focusedArt.length > 0 ? (
                  <ArtGallery art={focusedArt} bookId={bookId} isMod={isMod} />
                ) : (
                  <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                    No art yet for this chapter.
                  </p>
                )
              ) : (
                <ChapterTalk
                  bookId={bookId}
                  chapterId={focused.id}
                  chapterNumber={focused.number}
                  comments={focusedComments}
                  signedIn={signedIn}
                  hasUsername={hasUsername}
                />
              )}
            </>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
              <LockIcon />
              <span>
                You haven&apos;t read this far yet. Mark it read to unlock its
                art and discussion.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
