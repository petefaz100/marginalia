import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addBook } from "./books/actions";
import { searchBooks, type BookSearchResult } from "@/lib/google-books";
import { SiteHeader } from "./_components/site-header";
import { CoverArt } from "./_components/cover-art";

function SearchBar({ query }: { query: string }) {
  return (
    <form action="/" method="get" className="flex gap-2">
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
}: {
  book: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
  };
}) {
  return (
    <Link href={`/books/${book.id}`} className="group block">
      <div
        className="mb-2 aspect-[2/3] w-full overflow-hidden rounded-[var(--radius-sm)]"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        <CoverArt url={book.cover_url} title={book.title} />
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, year, cover_url, google_books_id")
    .order("created_at", { ascending: false });
  const library = books ?? [];
  const addedIds = new Set(
    library.map((b) => b.google_books_id).filter(Boolean) as string[],
  );

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
      className="relative mx-auto min-h-screen"
      style={{
        maxWidth: "var(--maxw)",
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <SiteHeader />

      <main style={{ padding: "8px 2px 6px" }}>
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 14 }}
        >
          a reading companion
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
          <h2
            className="mb-3 font-display text-[18px] font-medium"
            style={{ color: "var(--silver-bright)" }}
          >
            Library
          </h2>

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
            <div className="grid grid-cols-3 gap-x-3 gap-y-5">
              {library.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
