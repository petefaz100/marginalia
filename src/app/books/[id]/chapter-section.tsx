"use client";

import { useState } from "react";
import { setReadThrough } from "../actions";
import { ArtGallery, type GalleryArt } from "../../_components/art-gallery";
import { ArtCarousel } from "../../_components/art-carousel";
import { ChapterTalk, type ChapterComment } from "./chapter-talk";

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

function FrameIcon() {
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

function TalkIcon() {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform .15s",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type TabKey = "art" | "gallery" | "talk";

// One chapter card. Unlocked chapters expand to show three tabs — art (inline
// carousel), gallery (thumbnail grid), and talk (the per-chapter comment
// stream). Locked chapters are dimmed and can't be opened.
function ChapterCard({
  bookId,
  chapter,
  unlocked,
  art,
  comments,
  signedIn,
  hasUsername,
  isMod,
  defaultOpen,
}: {
  bookId: string;
  chapter: Chapter;
  unlocked: boolean;
  art: GalleryArt[];
  comments: ChapterComment[];
  signedIn: boolean;
  hasUsername: boolean;
  isMod: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && unlocked);
  // Open to "art" when there's art to show, otherwise straight to "talk".
  const [tab, setTab] = useState<TabKey>(art.length > 0 ? "art" : "talk");

  const artCount = art.length;
  const commentCount = comments.length;

  return (
    <div
      className="rounded-[var(--radius-sm)] p-3.5"
      style={{
        border: "1px solid var(--line)",
        background: "var(--obsidian-2)",
        opacity: unlocked ? 1 : 0.7,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mark-read pill — toggles your reading position at this chapter. */}
        {signedIn ? (
          <form action={setReadThrough} className="shrink-0">
            <input type="hidden" name="bookId" value={bookId} />
            <input
              type="hidden"
              name="through"
              value={unlocked ? chapter.number - 1 : chapter.number}
            />
            <button
              type="submit"
              aria-label={
                unlocked
                  ? `Mark chapter ${chapter.number} unread`
                  : `Mark chapter ${chapter.number} read`
              }
              title={unlocked ? "Mark unread" : "Mark this read"}
              className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold"
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
              {unlocked ? "✓ read" : "mark read"}
            </button>
          </form>
        ) : null}

        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold"
          style={{
            border: "1px solid var(--line-2)",
            background: "var(--obsidian-3)",
            color: unlocked ? "var(--ember-soft)" : "var(--muted-2)",
          }}
        >
          {chapter.number}
        </span>

        {/* Title — clicking it toggles the chapter open (unlocked only). */}
        <button
          type="button"
          onClick={() => unlocked && setOpen((o) => !o)}
          disabled={!unlocked}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span
            className="min-w-0 flex-1 truncate text-[14px] font-semibold"
            style={{ color: "var(--silver-bright)" }}
          >
            {chapter.title || `Chapter ${chapter.number}`}
          </span>
          {unlocked ? (
            <ChevronIcon open={open} />
          ) : (
            <span
              className="flex shrink-0 items-center gap-1.5 text-[12px]"
              style={{ color: "var(--muted-2)" }}
            >
              <LockIcon />
              Locked
            </span>
          )}
        </button>
      </div>

      {unlocked && open ? (
        <>
          {/* Tabs: art / gallery / talk */}
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
                key === "talk"
                  ? commentCount
                  : key === "art" || key === "gallery"
                    ? artCount
                    : 0;
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
            artCount > 0 ? (
              <ArtCarousel art={art} bookId={bookId} isMod={isMod} />
            ) : (
              <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                No art yet for this chapter.
              </p>
            )
          ) : tab === "gallery" ? (
            artCount > 0 ? (
              <ArtGallery art={art} bookId={bookId} isMod={isMod} />
            ) : (
              <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                No art yet for this chapter.
              </p>
            )
          ) : (
            <ChapterTalk
              bookId={bookId}
              chapterId={chapter.id}
              chapterNumber={chapter.number}
              comments={comments}
              signedIn={signedIn}
              hasUsername={hasUsername}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

// The chapters area of a book page. A read-through selector sits on top; below
// it every chapter is a card. Unlocked chapters open to art/gallery/talk tabs;
// chapters past your place stay locked behind the spoiler divider. The gate is
// enforced server-side too (RLS), so this is presentation only.
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
  if (chapters.length === 0) {
    return (
      <p className="mb-4 text-[13px]" style={{ color: "var(--muted)" }}>
        No chapters yet.
      </p>
    );
  }

  const firstLockedIndex = chapters.findIndex((c) => c.number > readThrough);
  // Auto-open the chapter at your current place so the page lands on something.
  const openNumber = readThrough;

  return (
    <>
      {/* Progress selector */}
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

      <ul className="flex flex-col gap-2.5">
        {chapters.map((ch, i) => {
          const unlocked = ch.number <= readThrough;
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
              <ChapterCard
                bookId={bookId}
                chapter={ch}
                unlocked={unlocked}
                art={artByChapter[ch.id] ?? []}
                comments={commentsByChapter[ch.id] ?? []}
                signedIn={signedIn}
                hasUsername={hasUsername}
                isMod={isMod}
                defaultOpen={ch.number === openNumber}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
