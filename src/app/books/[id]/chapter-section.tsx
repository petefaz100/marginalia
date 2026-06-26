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

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
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

// Decorative gradients for the "waiting ahead" teaser tiles. These are NOT
// real artwork — just colored, heavily-blurred placeholders so a reader can
// sense how much art is coming without anything being spoiled. Picked by
// chapter number so a given chapter's tiles stay visually consistent.
const TEASER_GRADIENTS = [
  "linear-gradient(135deg,#e0683f,#8a3a5b)",
  "linear-gradient(135deg,#6f8fc9,#8a3a5b)",
  "linear-gradient(135deg,#c9a25e,#e0683f)",
  "linear-gradient(135deg,#6db28a,#6f8fc9)",
  "linear-gradient(135deg,#b25c7d,#6f8fc9)",
  "linear-gradient(135deg,#8a3a5b,#2a2535)",
];

// A single locked-art teaser: a chapter-labelled, heavily blurred placeholder
// with a lock. The real image is never fetched (RLS hides it server-side), so
// there's nothing here to un-blur or spoil — it simply marks "art lives here,
// keep reading." It turns into the real piece automatically once the reader
// marks that chapter read (then RLS starts sending the actual row).
function LockedTile({ chapter }: { chapter: number }) {
  const gradient = TEASER_GRADIENTS[chapter % TEASER_GRADIENTS.length];
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-[10px]"
      style={{ border: "1px solid var(--line-2)", background: "var(--obsidian-3)" }}
      aria-label={`Locked art from chapter ${chapter}`}
      title={`Locked — from chapter ${chapter}. Mark it read to reveal.`}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -16,
          background: gradient,
          filter: "blur(16px)",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ color: "rgba(232,228,240,.7)" }}
      >
        <LockIcon size={18} />
      </div>
      <span
        className="absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
        style={{ background: "rgba(19,17,25,.82)", color: "var(--silver)" }}
      >
        Ch. {chapter}
      </span>
    </div>
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

// The chapters area of a book page. Up top sits an always-on search + a "what
// chapter are you on?" picker that sets your reading position (the value the
// spoiler gate compares against). Below that, a focused single-chapter view for
// reading one chapter's art and discussion. Art you've unlocked shows for real;
// art from chapters you haven't reached appears only as blurred, chapter-
// labelled teaser tiles — the real images are never sent to the browser, so the
// gate is enforced server-side (RLS), not by CSS.
export function ChapterSection({
  bookId,
  chapters,
  readThrough,
  artByChapter,
  artCountByChapter,
  commentsByChapter,
  signedIn,
  hasUsername = false,
  isMod = false,
}: {
  bookId: string;
  chapters: Chapter[];
  readThrough: number;
  artByChapter: Record<string, GalleryArt[]>;
  artCountByChapter: Record<string, number>;
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
  const [tab, setTab] = useState<TabKey>(initialHasArt ? "art" : "talk");
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  // The "what chapter are you on?" dropdown is controlled so the Confirm button
  // submits whatever's currently picked. It re-initialises to the saved value
  // whenever the page re-renders after a save.
  const [chapterChoice, setChapterChoice] = useState(readThrough);

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

  // Clamp the focus picker to a real chapter.
  const focusNum = Math.min(Math.max(focus, 1), total);
  const focused = chapters.find((c) => c.number === focusNum) ?? chapters[0];
  const unlocked = focused.number <= readThrough;
  const focusedArt = artByChapter[focused.id] ?? [];
  const focusedComments = commentsByChapter[focused.id] ?? [];

  // Everything unlocked, flattened, for the search grid.
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

  // Teaser tiles for art in chapters the reader hasn't reached. We only know
  // HOW MANY pieces each locked chapter has (from a counts-only function) — we
  // never receive the images themselves, so these stay safe placeholders.
  const lockedTeasers: { key: string; chapter: number }[] = [];
  for (const c of chapters) {
    if (c.number > readThrough) {
      const n = artCountByChapter[c.id] ?? 0;
      for (let i = 0; i < n; i++) {
        lockedTeasers.push({ key: `${c.id}-${i}`, chapter: c.number });
      }
    }
  }
  const lockedCount = lockedTeasers.length;

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
          "You haven't started yet — set the chapter you're on to reveal its art and discussion."
        )}
      </p>

      {/* "What chapter are you on?" — sets reading progress (the spoiler gate). */}
      <form
        action={setReadThrough}
        className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        <input type="hidden" name="bookId" value={bookId} />
        <label
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--ember-soft)" }}
          htmlFor="chapter-on"
        >
          What chapter are you on?
        </label>
        <select
          id="chapter-on"
          name="through"
          value={chapterChoice}
          onChange={(e) => setChapterChoice(Number(e.target.value))}
          className="h-9 min-w-[8rem] flex-1 rounded-[8px] px-2 text-[13px] outline-none"
          style={{
            border: "1px solid var(--line-2)",
            background: "var(--obsidian-3)",
            color: "var(--silver-bright)",
          }}
        >
          <option value={0}>Not started yet</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.number}>
              {c.title ? `Ch. ${c.number} · ${c.title}` : `Chapter ${c.number}`}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirm
        </button>
      </form>

      {/* Always-on search across the art you've unlocked. */}
      <div className="mb-2">
        <div
          className="flex h-10 items-center gap-2 rounded-[var(--radius-sm)] px-3"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--muted)",
          }}
        >
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search art by title or artist…"
            autoComplete="off"
            className="h-full w-full bg-transparent text-[13.5px] outline-none"
            style={{ color: "var(--silver-bright)" }}
          />
        </div>
        <label
          className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-[12.5px]"
          style={{ color: "var(--silver)" }}
        >
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="h-4 w-4 accent-[var(--ember)]"
          />
          Show all hidden art
          {lockedCount > 0 ? (
            <span style={{ color: "var(--muted)" }}>({lockedCount} locked)</span>
          ) : null}
        </label>
      </div>

      {/* Results grid: real unlocked art (searchable) + locked teaser tiles. */}
      {filteredAll.length > 0 ? (
        <ArtGallery art={filteredAll} bookId={bookId} isMod={isMod} />
      ) : (
        <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
          {q
            ? "No unlocked art matches your search."
            : readThrough > 0
              ? "No art in the chapters you've unlocked yet."
              : "Set the chapter you're on to start revealing art."}
        </p>
      )}

      {showHidden && lockedCount > 0 ? (
        <div className="mt-5">
          <div
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: "var(--muted)" }}
          >
            <LockIcon size={13} />
            <span>
              Waiting ahead · {lockedCount}{" "}
              {lockedCount === 1 ? "piece" : "pieces"} locked
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {lockedTeasers.map((t) => (
              <LockedTile key={t.key} chapter={t.chapter} />
            ))}
          </div>
          <p className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
            These reveal automatically as you mark their chapters read — the real
            images are kept off your screen until then, so nothing&apos;s spoiled.
          </p>
        </div>
      ) : !showHidden && lockedCount > 0 ? (
        <p className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>
          {lockedCount} {lockedCount === 1 ? "piece is" : "pieces are"} locked
          ahead. Tick “Show all hidden art” to see where they wait, or move your
          chapter forward to unlock them.
        </p>
      ) : null}

      {/* Browse a single chapter's art + discussion. */}
      <div
        className="mt-7 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-sm)] px-3 py-2.5"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-semibold"
            style={{ color: "var(--ember-soft)" }}
          >
            Browse chapter
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFocus(focusNum - 1)}
              disabled={focusNum <= 1}
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
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) setFocus(Math.min(Math.max(n, 1), total));
              }}
              aria-label="Chapter number"
              className="h-8 w-14 rounded-[8px] px-2 text-center text-[13px] outline-none"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver-bright)",
              }}
            />
            <button
              type="button"
              onClick={() => setFocus(focusNum + 1)}
              disabled={focusNum >= total}
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
      </div>

      {/* Focused single-chapter view. */}
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
                isMod={isMod}
              />
            )}
          </>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
            <LockIcon />
            <span>
              You haven&apos;t read this far yet. Mark it read to unlock its art
              and discussion.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
