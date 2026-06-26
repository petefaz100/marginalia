import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../../_components/site-header";
import { CoverArt } from "../../_components/cover-art";
import { addChapter } from "../actions";
import { type GalleryArt } from "../../_components/art-gallery";
import { ArtUpload } from "../../_components/art-upload";
import { ChapterSection } from "./chapter-section";
import { DiscussionPanel, type DiscThread } from "./discussion-panel";

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
  // RLS only returns threads/comments for chapters the reader has unlocked (plus
  // their own), so the spoiler gate holds even though we query the whole book.
  const { data: threadRows } = await supabase
    .from("threads")
    .select("id, chapter_id, author_id, title, body, created_at")
    .eq("book_id", id)
    .order("created_at", { ascending: false });
  const threadList = threadRows ?? [];
  const threadIds = threadList.map((t) => t.id);

  const { data: commentRows } = threadIds.length
    ? await supabase
        .from("comments")
        .select("id, thread_id, parent_id, author_id, body, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })
    : { data: [] };
  const commentList = commentRows ?? [];

  // Vote tallies for every visible thread + comment, in one query.
  const targetIds = [...threadIds, ...commentList.map((c) => c.id)];
  const { data: voteRows } = targetIds.length
    ? await supabase
        .from("votes")
        .select("target_type, target_id, value, user_id")
        .in("target_id", targetIds)
    : { data: [] };
  const votes = voteRows ?? [];
  const tally = (type: "thread" | "comment", targetId: string) => {
    let score = 0;
    let myVote = 0;
    for (const v of votes) {
      if (v.target_type === type && v.target_id === targetId) {
        score += v.value;
        if (user && v.user_id === user.id) myVote = v.value;
      }
    }
    return { score, myVote };
  };

  // Public display names for thread/comment authors. We show the chosen public
  // USERNAME only — never the reader's real name — to honor the privacy promise.
  const authorIds = [
    ...new Set(
      [
        ...threadList.map((t) => t.author_id),
        ...commentList.map((c) => c.author_id),
      ].filter((x): x is string => !!x),
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

  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const commentsByThread = new Map<string, DiscThread["comments"]>();
  for (const c of commentList) {
    const { score, myVote } = tally("comment", c.id);
    const list = commentsByThread.get(c.thread_id) ?? [];
    list.push({
      id: c.id,
      parentId: c.parent_id,
      body: c.body,
      author: nameOf(c.author_id),
      createdAt: c.created_at,
      score,
      myVote,
    });
    commentsByThread.set(c.thread_id, list);
  }
  const threads: DiscThread[] = threadList.map((t) => {
    const ch = chapterById.get(t.chapter_id);
    const { score, myVote } = tally("thread", t.id);
    return {
      id: t.id,
      chapterId: t.chapter_id,
      chapterNumber: ch?.number ?? 0,
      chapterTitle: ch?.title ?? null,
      title: t.title,
      body: t.body,
      author: nameOf(t.author_id),
      createdAt: t.created_at,
      score,
      myVote,
      comments: commentsByThread.get(t.id) ?? [],
    };
  });
  const unlockedChapters = chapters.filter((c) => c.number <= readThrough);

  const nextNumber =
    chapters.length > 0 ? chapters[chapters.length - 1].number + 1 : 1;

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

        {/* Reading position */}
        <section className="mt-7">
          <h2
            className="mb-2 text-[11.5px] tracking-[.16em] uppercase"
            style={{ color: "var(--ember-soft)" }}
          >
            Your progress
          </h2>
          {!user ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Sign in to track how far you&apos;ve read — art stays hidden until
              you reach the chapter it belongs to.
            </p>
          ) : chapters.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Add a chapter below, then mark it read to start revealing art.
            </p>
          ) : readThrough > 0 ? (
            <>
              <p
                className="font-display text-[18px] font-medium"
                style={{ color: "var(--silver-bright)" }}
              >
                You&apos;re currently on chapter {readThrough}
                {chapterById.get(
                  chapters.find((c) => c.number === readThrough)?.id ?? "",
                )?.title
                  ? ` · ${chapters.find((c) => c.number === readThrough)?.title}`
                  : ""}
              </p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>
                Art and discussion up to here are unlocked. Use the ✓ button on a
                chapter below to move your place.
              </p>
            </>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--silver)" }}>
              You haven&apos;t marked any chapters read yet — tap the circle on
              the left of a chapter below to reveal its art.
            </p>
          )}
        </section>

        {/* Chapters + spoiler gate */}
        <section className="mt-8">
          <h2
            className="mb-3 font-display text-[18px] font-medium"
            style={{ color: "var(--silver-bright)" }}
          >
            Chapters
          </h2>

          <ChapterSection
            bookId={book.id}
            chapters={chapters}
            readThrough={readThrough}
            artByChapter={Object.fromEntries(artByChapter)}
            signedIn={!!user}
            isMod={isMod}
          />

          {/* Add a chapter */}
          {user ? (
            <form
              action={addChapter}
              className="mt-4 flex items-end gap-2 rounded-[var(--radius-sm)] p-3"
              style={{
                border: "1px solid var(--line)",
                background: "var(--obsidian-2)",
              }}
            >
              <input type="hidden" name="bookId" value={book.id} />
              <label className="shrink-0">
                <span
                  className="mb-1 block text-[11px] tracking-wide uppercase"
                  style={{ color: "var(--muted)" }}
                >
                  No.
                </span>
                <input
                  type="number"
                  name="number"
                  min={1}
                  defaultValue={nextNumber}
                  className="h-10 w-16 rounded-[10px] px-2.5 text-[14px] outline-none"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--silver-bright)",
                  }}
                />
              </label>
              <label className="min-w-0 flex-1">
                <span
                  className="mb-1 block text-[11px] tracking-wide uppercase"
                  style={{ color: "var(--muted)" }}
                >
                  Chapter title (optional)
                </span>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. The Shattered Sea"
                  autoComplete="off"
                  className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--silver-bright)",
                  }}
                />
              </label>
              <button
                type="submit"
                className="h-10 shrink-0 rounded-[10px] px-4 text-[13px] font-semibold"
                style={{ background: "var(--ember)", color: "#fff" }}
              >
                Add
              </button>
            </form>
          ) : (
            <p className="mt-4 text-[12.5px]" style={{ color: "var(--muted)" }}>
              Sign in to add chapters.
            </p>
          )}

          {user && chapters.length > 0 ? (
            <ArtUpload bookId={book.id} chapters={chapters} isMod={isMod} />
          ) : null}
        </section>

        {/* Discussion — chapter-gated threads + comments */}
        <section className="mt-10">
          <h2
            className="mb-3 font-display text-[18px] font-medium"
            style={{ color: "var(--silver-bright)" }}
          >
            Discussion
          </h2>
          <DiscussionPanel
            bookId={book.id}
            unlockedChapters={unlockedChapters}
            threads={threads}
            signedIn={!!user}
            hasUsername={hasUsername}
          />
        </section>
      </main>
    </div>
  );
}
