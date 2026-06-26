import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../../_components/site-header";
import { CoverArt } from "../../_components/cover-art";
import { type GalleryArt } from "../../_components/art-gallery";
import { ChapterSection } from "./chapter-section";
import { Contribute } from "./contribute";
import { type ChapterComment } from "./chapter-talk";

// Vote tallies and comments change constantly and must reflect the live database
// on every visit. Forcing dynamic rendering keeps the page from ever serving a
// stale snapshot (e.g. an upvote count that "disappears" after you navigate away
// and come back).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, author")
    .eq("id", id)
    .maybeSingle();
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: book.author
      ? `Fan art for ${book.title} by ${book.author}, chapter by chapter.`
      : `Fan art for ${book.title}, chapter by chapter.`,
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, year, cover_url")
    .eq("id", id)
    .maybeSingle();
  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Whether the viewer is a mod (sees Add/Delete controls) and whether they've
  // chosen a public username (required before posting in discussions).
  let isMod = false;
  let hasUsername = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_mod, username")
      .eq("id", user.id)
      .maybeSingle();
    isMod = profile?.is_mod ?? false;
    hasUsername = !!profile?.username;
  }

  const { data: chapterRows } = await supabase
    .from("chapters")
    .select("id, number, title")
    .eq("book_id", id)
    .order("number", { ascending: true });
  const chapters = chapterRows ?? [];

  let readThrough = 0;
  if (user) {
    const { data: progress } = await supabase
      .from("reading_progress")
      .select("chapter_read_through")
      .eq("user_id", user.id)
      .eq("book_id", id)
      .maybeSingle();
    readThrough = progress?.chapter_read_through ?? 0;
  }

  // RLS only returns art the reader is allowed to see (approved + at/below the
  // chapter they've read, plus their own uploads), so grouping the rows by
  // chapter already respects the spoiler gate.
  // Rejected art is deleted on rejection, but we also filter it out here as a
  // belt-and-suspenders guard so a stray rejected row could never surface in
  // any view (chapter, gallery, or search).
  const { data: arts } = await supabase
    .from("artworks")
    .select("id, chapter_id, image_url, title, artist_handle, credit_url, status")
    .eq("book_id", id)
    .neq("status", "rejected");
  const artByChapter = new Map<string, GalleryArt[]>();
  for (const a of arts ?? []) {
    const list = artByChapter.get(a.chapter_id) ?? [];
    list.push(a);
    artByChapter.set(a.chapter_id, list);
  }

  // ---- Discussion data ----------------------------------------------------
  // Comments live under per-chapter "threads" (one implicit thread per chapter
  // in the new flat model, plus any legacy titled threads). We fetch the threads
  // only to map each comment back to its chapter; the UI never shows threads.
  // RLS only returns rows for chapters the reader has unlocked, so the spoiler
  // gate holds even though we query the whole book.
  const { data: threadRows } = await supabase
    .from("threads")
    .select("id, chapter_id")
    .eq("book_id", id);
  const threadList = threadRows ?? [];
  const chapterOfThread = new Map(threadList.map((t) => [t.id, t.chapter_id]));
  const threadIds = threadList.map((t) => t.id);

  const { data: commentRows } = threadIds.length
    ? await supabase
        .from("comments")
        .select("id, thread_id, parent_id, author_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })
    : { data: [] };
  const commentList = commentRows ?? [];

  // Vote tallies for every visible comment, in one query.
  const commentIds = commentList.map((c) => c.id);
  const { data: voteRows } = commentIds.length
    ? await supabase
        .from("votes")
        .select("target_type, target_id, value, user_id")
        .eq("target_type", "comment")
        .in("target_id", commentIds)
    : { data: [] };
  const votes = voteRows ?? [];
  const tallyComment = (targetId: string) => {
    let score = 0;
    let myVote = 0;
    for (const v of votes) {
      if (v.target_id === targetId) {
        score += v.value;
        if (user && v.user_id === user.id) myVote = v.value;
      }
    }
    return { score, myVote };
  };

  // Public display names for comment authors. We show the chosen public
  // USERNAME only — never the reader's real name — to honor the privacy promise.
  const authorIds = [
    ...new Set(
      commentList.map((c) => c.author_id).filter((x): x is string => !!x),
    ),
  ];
  const nameById = new Map<string, string>();
  if (authorIds.length) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", authorIds);
    for (const a of authors ?? []) {
      nameById.set(a.id, a.username || "reader");
    }
  }
  const nameOf = (uid: string | null) =>
    (uid && nameById.get(uid)) || "reader";

  // Group every comment under the CHAPTER its thread belongs to, so each chapter
  // shows one flat discussion regardless of how many underlying threads exist.
  const commentsByChapter = new Map<string, ChapterComment[]>();
  for (const c of commentList) {
    const chapterId = chapterOfThread.get(c.thread_id);
    if (!chapterId) continue;
    const { score, myVote } = tallyComment(c.id);
    const list = commentsByChapter.get(chapterId) ?? [];
    list.push({
      id: c.id,
      parentId: c.parent_id,
      body: c.body,
      author: nameOf(c.author_id),
      createdAt: c.created_at,
      score,
      myVote,
    });
    commentsByChapter.set(chapterId, list);
  }

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] md:max-w-[680px]"
      style={{
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <SiteHeader />

      <main style={{ padding: "8px 2px 6px" }}>
        <Link
          href="/library"
          className="inline-block text-[12.5px]"
          style={{ color: "var(--muted)", marginBottom: 14 }}
        >
          ← Library
        </Link>

        {/* Book header */}
        <div className="flex gap-4">
          <div
            className="h-[132px] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius-sm)]"
            style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
          >
            <CoverArt url={book.cover_url} title={book.title} />
          </div>
          <div className="min-w-0 flex-1 self-end">
            <h1
              className="font-display text-[24px] leading-tight font-medium"
              style={{ color: "var(--silver-bright)" }}
            >
              {book.title}
            </h1>
            <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
              {book.author ?? "Unknown author"}
              {book.year ? ` · ${book.year}` : ""}
            </p>
          </div>
        </div>

        {/* Chapters + spoiler gate */}
        <section className="mt-7">
          <ChapterSection
            bookId={book.id}
            chapters={chapters}
            readThrough={readThrough}
            artByChapter={Object.fromEntries(artByChapter)}
            commentsByChapter={Object.fromEntries(commentsByChapter)}
            signedIn={!!user}
            hasUsername={hasUsername}
            isMod={isMod}
          />

          {user ? (
            <Contribute bookId={book.id} chapters={chapters} isMod={isMod} />
          ) : null}
        </section>
      </main>
    </div>
  );
}
