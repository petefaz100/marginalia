// Thin wrapper over the Google Books "volumes" search endpoint. Runs only on
// the server so the API key (if set) never reaches the client. Works without a
// key too — Google allows unauthenticated queries at a lower quota.

const ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

export type BookSearchResult = {
  googleBooksId: string;
  title: string;
  author: string | null;
  year: number | null;
  coverUrl: string | null;
  description: string | null;
};

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    maxResults: "16",
    printType: "books",
    // Google rejects volume searches from server IPs without an explicit
    // country; this keeps results consistent regardless of where it runs.
    country: "US",
  });
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) params.set("key", key);

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);

  const data = (await res.json()) as { items?: GoogleVolume[] };
  if (!data.items) return [];

  const seen = new Set<string>();
  const results: BookSearchResult[] = [];
  for (const item of data.items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const info = item.volumeInfo ?? {};
    const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
    const year = info.publishedDate
      ? Number(info.publishedDate.slice(0, 4)) || null
      : null;

    results.push({
      googleBooksId: item.id,
      title: info.title ?? "Untitled",
      author: info.authors?.length ? info.authors.join(", ") : null,
      year,
      // Google serves covers over http; force https so they load on our page.
      coverUrl: thumb ? thumb.replace(/^http:\/\//, "https://") : null,
      description: info.description ?? null,
    });
  }
  return results;
}
