import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../../_components/site-header";
import { CoverArt } from "../../_components/cover-art";
import { addChapter } from "../actions";
import { type GalleryArt } from "../../_components/art-gallery";
import { ArtUpload } from "../../_components/art-upload";
import { ChapterSection } from "./chapter-section";

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
          href="/"
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
          ) : (
            <p className="text-[13px]" style={{ color: "var(--silver)" }}>
              {readThrough > 0
                ? `You've read through chapter ${readThrough}. Use the ✓ button on a chapter below to move your place.`
                : "You haven't marked any chapters read yet — tap the circle on the left of a chapter below to reveal its art."}
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
            <ArtUpload bookId={book.id} chapters={chapters} />
          ) : null}
        </section>
      </main>
    </div>
  );
}
