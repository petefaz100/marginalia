import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle, signOut } from "./auth/actions";
import { addBook } from "./books/actions";
import { searchBooks, type BookSearchResult } from "@/lib/google-books";

function LeafMark() {
  return (
    <svg
      width="30"
      height="42"
      viewBox="0 0 40 56"
      fill="none"
      style={{ filter: "drop-shadow(0 0 10px rgba(159,182,224,.35))" }}
    >
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe6f2" />
          <stop offset="1" stopColor="#6f8fc9" />
        </linearGradient>
      </defs>
      <path
        d="M20 4c2 8-4 11-4 18 0 4 2 6 2 9-3-1-5-4-5-8-4 4-6 9-6 14 0 8 6 14 13 14s13-6 13-14c0-9-7-12-9-21-1-4 1-7 1-12-3 2-5 5-5 9 0 0-1-9 5-19z"
        fill="url(#leaf)"
      />
    </svg>
  );
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#e0683f,#8a3a5b)",
  "linear-gradient(135deg,#6f8fc9,#8a3a5b)",
  "linear-gradient(135deg,#c9a25e,#e0683f)",
  "linear-gradient(135deg,#6db28a,#6f8fc9)",
  "linear-gradient(135deg,#b25c7d,#6f8fc9)",
];

function AuthControl({
  signedIn,
  name,
  avatarUrl,
}: {
  signedIn: boolean;
  name?: string;
  avatarUrl?: string | null;
}) {
  if (!signedIn) {
    return (
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--silver)",
          }}
        >
          Sign in
        </button>
      </form>
    );
  }

  const label = name || "reader";
  const initial = label.charAt(0).toUpperCase();
  const gradient =
    AVATAR_GRADIENTS[initial.charCodeAt(0) % AVATAR_GRADIENTS.length];

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 rounded-full py-[5px] pr-3 pl-[5px]"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span
            className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold text-white"
            style={{ background: gradient }}
          >
            {initial}
          </span>
        )}
        <span
          className="max-w-[120px] truncate text-[13px] font-semibold"
          style={{ color: "var(--silver)" }}
        >
          {label}
        </span>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="grid h-10 w-10 place-items-center rounded-[13px]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--muted)",
          }}
          aria-label="Sign out"
          title="Sign out"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function CoverArt({
  url,
  title,
  radius = "var(--radius-sm)",
}: {
  url: string | null;
  title: string;
  radius?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Cover of ${title}`}
        className="h-full w-full object-cover"
        style={{ borderRadius: radius }}
      />
    );
  }
  return (
    <div
      className="grid h-full w-full place-items-center p-2 text-center font-display text-[13px] leading-tight"
      style={{
        borderRadius: radius,
        background:
          "linear-gradient(160deg, var(--obsidian-3), var(--obsidian-2))",
        color: "var(--muted)",
      }}
    >
      {title}
    </div>
  );
}

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
    year: number | null;
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

  let displayName: string | undefined;
  let avatarUrl: string | null | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, display_name, avatar_url")
      .eq("id", user.id)
      .single();
    displayName =
      profile?.display_name || profile?.handle || user.email || "reader";
    avatarUrl = profile?.avatar_url;
  }

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
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3"
        style={{
          padding: "16px 0 12px",
          background:
            "linear-gradient(180deg, var(--obsidian) 62%, rgba(19,17,25,0))",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <LeafMark />
          <span
            className="font-display text-[23px] leading-none font-semibold tracking-[.2px]"
            style={{ color: "var(--silver-bright)" }}
          >
            margi
            <i className="italic" style={{ color: "var(--ember-soft)" }}>
              nalia
            </i>
          </span>
        </div>
        <AuthControl signedIn={!!user} name={displayName} avatarUrl={avatarUrl} />
      </header>

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
              <p
                className="mt-1 text-[13px]"
                style={{ color: "var(--muted)" }}
              >
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
