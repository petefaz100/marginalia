import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../../_components/site-header";
import { CoverArt } from "../../_components/cover-art";
import { addChapter, setReadThrough } from "../actions";

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

  // RLS only returns art the reader is allowed to see, so a raw count per
  // chapter already respects the spoiler gate.
  const { data: arts } = await supabase
    .from("artworks")
    .select("id, chapter_id")
    .eq("book_id", id);
  const artCount = new Map<string, number>();
  for (const a of arts ?? []) {
    artCount.set(a.chapter_id, (artCount.get(a.chapter_id) ?? 0) + 1);
  }

  const nextNumber =
    chapters.length > 0 ? chapters[chapters.length - 1].number + 1 : 1;
  const firstLockedIndex = chapters.findIndex((c) => c.number > readThrough);

  return (
    <div
      className="relative mx-auto min-h-screen"
      style={{
        maxWidth: "var(--maxw)",
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
            <>
              <p className="mb-2.5 text-[13px]" style={{ color: "var(--silver)" }}>
                {readThrough > 0
                  ? `You've read through chapter ${readThrough}.`
                  : "You haven't marked any chapters read yet."}
              </p>
              <div className="flex flex-wrap gap-2">
                {[{ number: 0 }, ...chapters].map((c) => {
                  const selected = c.number === readThrough;
                  return (
                    <form action={setReadThrough} key={c.number}>
                      <input type="hidden" name="bookId" value={book.id} />
                      <input type="hidden" name="through" value={c.number} />
                      <button
                        type="submit"
                        className="h-9 rounded-full px-3 text-[12.5px] font-semibold"
                        style={
                          selected
                            ? { background: "var(--ember)", color: "#fff" }
                            : {
                                border: "1px solid var(--line)",
                                background: "var(--obsidian-2)",
                                color: "var(--silver)",
                              }
                        }
                      >
                        {c.number === 0 ? "Not started" : `Ch. ${c.number}`}
                      </button>
                    </form>
                  );
                })}
              </div>
            </>
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

          {chapters.length === 0 ? (
            <p
              className="mb-4 text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              No chapters yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {chapters.map((ch, i) => {
                const unlocked = ch.number <= readThrough;
                const count = artCount.get(ch.id) ?? 0;
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

                      {!unlocked && user ? (
                        <form action={setReadThrough} className="mt-3">
                          <input type="hidden" name="bookId" value={book.id} />
                          <input
                            type="hidden"
                            name="through"
                            value={ch.number}
                          />
                          <button
                            type="submit"
                            className="h-8 rounded-full px-3 text-[12px] font-semibold"
                            style={{
                              border: "1px solid var(--line-2)",
                              background: "var(--obsidian-3)",
                              color: "var(--ember-soft)",
                            }}
                          >
                            Mark read to here
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

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
        </section>
      </main>
    </div>
  );
}
