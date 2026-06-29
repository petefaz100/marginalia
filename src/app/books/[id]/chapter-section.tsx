"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setReadThrough } from "../actions";
import { ArtGallery, type GalleryArt } from "../../_components/art-gallery";
import { ArtCarousel } from "../../_components/art-carousel";
import { ChapterTalk, type ChapterComment } from "./chapter-talk";

type Chapter = { id: string; number: number; title: string | null };
type TabKey = "art" | "talk";
type ArtLayout = "carousel" | "grid";

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

function CheckIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

// A small spinning ring, shown on a button while its form action is in flight
// so a tap feels instant instead of "did that work?".
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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

// The one control that sets your place: "Up to which chapter have you read?"
// Picking a chapter auto-saves immediately (no extra confirm step) and unlocks
// everything up to and including it. Browsing chapters below never moves this
// line — only this picker does.
function ProgressPicker({
  bookId,
  total,
  readThrough,
}: {
  bookId: string;
  total: number;
  readThrough: number;
}) {
  return (
    <form
      action={setReadThrough}
      className="mb-5 rounded-[var(--radius-sm)] px-3.5 py-3.5"
      style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
    >
      <input type="hidden" name="bookId" value={bookId} />
      <label
        htmlFor="through-picker"
        className="block text-[14px] font-semibold"
        style={{ color: "var(--silver-bright)" }}
      >
        Up to which chapter have you read?
      </label>
      <select
        id="through-picker"
        name="through"
        defaultValue={String(readThrough)}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-2 h-11 w-full rounded-[var(--radius-sm)] px-3 text-[14px] font-semibold outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      >
        <option value="0">Not started yet</option>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            Chapter {n}
          </option>
        ))}
      </select>
      <ProgressStatus />
    </form>
  );
}

// The save indicator lives in its own component so it can read useFormStatus —
// that hook only reports the pending state of the <form> it's rendered inside.
// While saving it shows a spinner; otherwise it shows the reassuring helper text.
function ProgressStatus() {
  const { pending } = useFormStatus();
  return (
    <p
      className="mt-2 flex items-center gap-1.5 text-[12px]"
      style={{ color: "var(--muted)" }}
    >
      {pending ? (
        <>
          <Spinner size={12} />
          Saving…
        </>
      ) : (
        "Everything up to and including this chapter is unlocked — change it any time."
      )}
    </p>
  );
}

// The chapters area of a book page. You set your place with ONE picker — "Up
// to which chapter have you read?" — which is the only thing that moves your
// spoiler line. A separate chapter browser lets you look at any chapter without
// changing that line. Art you've unlocked shows for real; art from chapters you
// haven't reached appears only as blurred, chapter-labelled teaser tiles — the
// real images are never sent to the browser, so the gate is enforced
// server-side (RLS), not by CSS.
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
  // The Art tab can show as a swipeable carousel or a grid; the reader picks.
  const [artLayout, setArtLayout] = useState<ArtLayout>("carousel");
  const [query, setQuery] = useState("");
  // The whole "find art" panel (search + reveal pills + result grids) is hidden
  // behind a single button so a freshly opened book stays calm on a phone —
  // just where you are and the chapter you're reading.
  const [showFind, setShowFind] = useState(false);
  // Both galleries are collapsed by default — the reader opts in to seeing the
  // full unlocked grid and/or the locked teasers.
  const [showUnlocked, setShowUnlocked] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

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

  // Shared styling for the two opt-in toggle pills under the search bar.
  const pillBase =
    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors";
  const pillOn = { background: "var(--ember)", color: "#fff" } as const;
  const pillOff = {
    border: "1px solid var(--line-2)",
    background: "var(--obsidian-2)",
    color: "var(--silver)",
  } as const;

  return (
    <>
      {/* The single reading-position control. Pick the chapter you've read up
          to and it saves instantly — that's the only thing that moves your
          spoiler line. */}
      <ProgressPicker bookId={bookId} total={total} readThrough={readThrough} />

      {/* "Find art" — collapsed by default so a freshly opened book stays calm
          on a phone. Tapping it reveals search across unlocked art + two opt-in
          reveal pills, and any results render inside this panel. */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowFind((v) => !v)}
          aria-expanded={showFind}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] text-[13.5px] font-semibold"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: showFind ? "var(--ember-soft)" : "var(--silver)",
          }}
        >
          <SearchIcon />
          {showFind ? "Hide art finder" : "Find art"}
        </button>

        {showFind ? (
          <div className="mt-2">
            <div
              className="flex h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3"
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
                className="h-full w-full bg-transparent text-[14px] outline-none"
                style={{ color: "var(--silver-bright)" }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnlocked((v) => !v)}
                aria-pressed={showUnlocked}
                className={pillBase}
                style={showUnlocked ? pillOn : pillOff}
              >
                {showUnlocked ? <CheckIcon size={13} /> : null}
                All unlocked art
                {allReadArt.length > 0 ? (
                  <span style={{ opacity: 0.8 }}>· {allReadArt.length}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                aria-pressed={showHidden}
                className={pillBase}
                style={showHidden ? pillOn : pillOff}
              >
                {showHidden ? <CheckIcon size={13} /> : <LockIcon size={12} />}
                Hidden art
                {lockedCount > 0 ? (
                  <span style={{ opacity: 0.8 }}>· {lockedCount} locked</span>
                ) : null}
              </button>
            </div>

            {/* Unlocked art grid — when searching or when opted in. */}
            {q || showUnlocked ? (
              filteredAll.length > 0 ? (
                <ArtGallery art={filteredAll} bookId={bookId} isMod={isMod} />
              ) : (
                <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                  {q
                    ? "No unlocked art matches your search."
                    : readThrough > 0
                      ? "No art in the chapters you've unlocked yet."
                      : "Set your reading chapter above to start revealing art."}
                </p>
              )
            ) : null}

            {/* Locked teaser tiles — when opted in. */}
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
                  These reveal automatically as your reading chapter reaches them
                  — the real images are kept off your screen until then, so
                  nothing&apos;s spoiled.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Focused single-chapter view — a browser for looking at any chapter.
          Stepping through here never changes your place; that's set only by the
          picker above. */}
      <div
        className="rounded-[var(--radius-sm)] p-3.5"
        style={{
          border: "1px solid var(--line)",
          background: "var(--obsidian-2)",
          opacity: unlocked ? 1 : 0.85,
        }}
      >
        {/* Chapter selector — step with the arrows or type a number to jump.
            Viewing here never changes your spoiler line. */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFocus(focusNum - 1)}
            disabled={focusNum <= 1}
            aria-label="Previous chapter"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] disabled:opacity-40"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--silver)",
            }}
          >
            <Arrow dir="left" />
          </button>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span style={{ color: "var(--muted)" }}>Chapter</span>
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
              className="h-9 w-12 rounded-[8px] px-1 text-center text-[14px] font-semibold outline-none"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver-bright)",
              }}
            />
            <span style={{ color: "var(--muted)" }}>of {total}</span>
          </div>
          <button
            type="button"
            onClick={() => setFocus(focusNum + 1)}
            disabled={focusNum >= total}
            aria-label="Next chapter"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] disabled:opacity-40"
            style={{
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: "var(--silver)",
            }}
          >
            <Arrow dir="right" />
          </button>
        </div>

        {/* Chapter title + a small lock cue when you haven't reached it. */}
        <div className="mt-3 flex items-center gap-2">
          {!unlocked ? (
            <span className="shrink-0" style={{ color: "var(--muted-2)" }}>
              <LockIcon size={15} />
            </span>
          ) : null}
          <h3
            className="min-w-0 flex-1 truncate text-[16px] font-semibold"
            style={{ color: "var(--silver-bright)" }}
          >
            {focused.title || `Chapter ${focused.number}`}
          </h3>
        </div>

        {unlocked ? (
          <>
            {/* Tabs — just Art and Talk now; the old "Gallery" is folded into
                Art as a layout toggle (carousel vs grid). */}
            <div className="mt-3 flex gap-2">
              {(
                [
                  ["art", "Art", <FrameIcon key="f" />],
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
                <>
                  {/* Carousel ↔ grid layout toggle for the art view. */}
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    {(
                      [
                        ["carousel", <FrameIcon key="c" />, "Carousel view"],
                        ["grid", <GridIcon key="g" />, "Grid view"],
                      ] as const
                    ).map(([key, icon, label]) => {
                      const active = artLayout === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setArtLayout(key)}
                          aria-label={label}
                          aria-pressed={active}
                          className="grid h-7 w-7 place-items-center rounded-[7px]"
                          style={
                            active
                              ? { background: "var(--ember)", color: "#fff" }
                              : {
                                  border: "1px solid var(--line-2)",
                                  background: "var(--obsidian-3)",
                                  color: "var(--silver)",
                                }
                          }
                        >
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                  {artLayout === "carousel" ? (
                    <ArtCarousel art={focusedArt} bookId={bookId} isMod={isMod} />
                  ) : (
                    <ArtGallery art={focusedArt} bookId={bookId} isMod={isMod} />
                  )}
                </>
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
              You haven&apos;t read this far yet. Set{" "}
              <span style={{ color: "var(--ember-soft)" }}>
                “Up to which chapter have you read?”
              </span>{" "}
              to chapter {focused.number} or beyond to unlock its art and
              discussion.
            </span>
          </div>
        )}
      </div>
    </>
  );
}
