import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addBook } from "../books/actions";
import { searchBooks, type BookSearchResult } from "@/lib/google-books";
import { SiteHeader } from "../_components/site-header";
import { CoverArt } from "../_components/cover-art";

export const metadata = { title: "Library" };

function SearchBar({ query }: { query: string }) {
  return (
    <form action="/library" method="get" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search by title or author…"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 rounded-[var(--radius-sm)] px-3.5 text-[14px] outline-none"
        style={{
          border: "1px solid var(--line)",
          background: "var(--obsidian-2)",
          color: "var(--silver-bright)",
        }}
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-[var(--radius-sm)] px-4 text-[13px] font-semibold"
        style={{ background: "var(--ember)", color: "#fff" }}
      >
        Search
      </button>
    </form>
  );
}

function ResultRow({
  result,
  signedIn,
  alreadyAdded,
}: {
  result: BookSearchResult;
  signedIn: boolean;
  alreadyAdded: boolean;
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5"
      style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
    >
      <div className="h-[66px] w-[44px] shrink-0 overflow-hidden rounded-[8px]">
        <CoverArt url={result.coverUrl} title={result.title} radius="8px" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[14px] font-semibold"
          style={{ color: "var(--silver-bright)" }}
        >
          {result.title}
        </p>
        <p className="truncate text-[12.5px]" style={{ color: "var(--muted)" }}>
          {result.author ?? "Unknown author"}
          {result.year ? ` · ${result.year}` : ""}
        </p>
      </div>
      <form action={addBook} className="shrink-0">
        <input type="hidden" name="googleBooksId" value={result.googleBooksId} />
        <input type="hidden" name="title" value={result.title} />
        <input type="hidden" name="author" value={result.author ?? ""} />
        <input type="hidden" name="year" value={result.year ?? ""} />
        <input type="hidden" name="coverUrl" value={result.coverUrl ?? ""} />
        <button
          type="submit"
          disabled={!signedIn || alreadyAdded}
          className="h-9 rounded-full px-3.5 text-[12.5px] font-semibold disabled:cursor-default"
          style={
            alreadyAdded
              ? {
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--muted-2)",
                }
              : {
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: signedIn ? "var(--ember-soft)" : "var(--muted-2)",
                }
          }
        >
          {alreadyAdded ? "Added" : "Add"}
        </button>
      </form>
    </li>
  );
}

function BookCard({
  book,
  empty,
}: {
  book: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  };
  empty: boolean;
}) {
  return (
    <Link href={`/books/${book.id}`} className="group block">
      <div
        className="relative mb-2 aspect-[2/3] w-full overflow-hidden rounded-[var(--radius-sm)]"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        <div
          className="h-full w-full"
          style={empty ? { filter: "grayscale(1)", opacity: 0.5 } : undefined}
        >
          <CoverArt url={book.cover_url} title={book.title} />
        </div>
        {empty ? (
          <span
            className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wide uppercase"
            style={{ background: "#fff", color: "var(--ember)" }}
          >
            No art yet
          </span>
        ) : null}
      </div>
      <p
        className="truncate text-[13px] font-semibold"
        style={{ color: "var(--silver-bright)" }}
      >
        {book.title}
      </p>
      <p className="truncate text-[12px]" style={{ color: "var(--muted)" }}>
        {book.author ?? "Unknown author"}
      </p>
    </Link>
  );
}

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort: sortParam } = await searchParams;
  const query = (q ?? "").trim();
  const sort: "az" | "recent" = sortParam === "recent" ? "recent" : "az";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetched newest-first; that order is used directly for "Recently added".
  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, year, cover_url, google_books_id")
    .order("created_at", { ascending: false });
  const addedIds = new Set(
    (books ?? []).map((b) => b.google_books_id).filter(Boolean) as string[],
  );

  // Which books actually have approved art (counts only — bypasses the
  // per-reader spoiler gate via a SECURITY DEFINER function, no titles leak).
  const { data: artCountRows } = await supabase.rpc("books_art_counts");
  const artCount = new Map<string, number>(
    (artCountRows ?? []).map((r) => [r.book_id, r.art_count]),
  );
  const hasArt = (id: string) => (artCount.get(id) ?? 0) > 0;

  // Default (A–Z): books with art first, alphabetically, then the empty ones.
  // Recently added keeps the newest-first order from the query.
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });
  const library = [...(books ?? [])].sort((a, b) => {
    if (sort === "recent") return 0; // stable: preserve created_at desc
    const diff = (hasArt(b.id) ? 1 : 0) - (hasArt(a.id) ? 1 : 0);
    if (diff !== 0) return diff;
    return collator.compare(a.title, b.title);
  });

  let results: BookSearchResult[] = [];
  let searchError: string | null = null;
  if (query) {
    try {
      results = await searchBooks(query);
    } catch {
      searchError = "Search is unavailable right now. Try again in a moment.";
    }
  }

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] sm:max-w-[680px] lg:max-w-[1000px]"
      style={{
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <SiteHeader />

      <main style={{ padding: "8px 2px 6px" }}>
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 14 }}
        >
          the library
        </p>

        <SearchBar query={query} />

        {query ? (
          <section className="mt-6">
            <h2
              className="mb-3 font-display text-[18px] font-medium"
              style={{ color: "var(--silver-bright)" }}
            >
              Results for{" "}
              <em className="italic" style={{ color: "var(--flame-2)" }}>
                {query}
              </em>
            </h2>

            {!user ? (
              <p
                className="mb-3 text-[12.5px]"
                style={{ color: "var(--muted)" }}
              >
                Sign in to add a book to the library.
              </p>
            ) : null}

            {searchError ? (
              <p className="text-[13px]" style={{ color: "var(--wine-soft)" }}>
                {searchError}
              </p>
            ) : results.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                No books found. Try a different title or author.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.map((r) => (
                  <ResultRow
                    key={r.googleBooksId}
                    result={r}
                    signedIn={!!user}
                    alreadyAdded={addedIds.has(r.googleBooksId)}
                  />
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              className="font-display text-[18px] font-medium"
              style={{ color: "var(--silver-bright)" }}
            >
              Library
            </h2>
            {library.length > 0 ? (
              <div className="flex gap-1.5">
                {(
                  [
                    ["az", "A–Z"],
                    ["recent", "Recently added"],
                  ] as const
                ).map(([key, label]) => {
                  const active = sort === key;
                  const params = new URLSearchParams();
                  if (query) params.set("q", query);
                  if (key === "recent") params.set("sort", "recent");
                  const href = params.toString()
                    ? `/library?${params}`
                    : "/library";
                  return (
                    <Link
                      key={key}
                      href={href}
                      scroll={false}
                      className="h-7 rounded-full px-2.5 text-[11.5px] font-semibold leading-7"
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
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          {library.length === 0 ? (
            <div
              className="rounded-[var(--radius)] px-5 py-8 text-center"
              style={{
                border: "1px dashed var(--line-2)",
                background: "var(--obsidian-2)",
              }}
            >
              <p className="text-[14px]" style={{ color: "var(--silver)" }}>
                No books yet.
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
                Search above to add the first one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
              {library.map((book) => (
                <BookCard key={book.id} book={book} empty={!hasArt(book.id)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
