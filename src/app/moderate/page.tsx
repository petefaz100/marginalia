import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../_components/site-header";
import { approveArt, rejectArt } from "./actions";

export default async function ModeratePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: isMod } = await supabase.rpc("is_mod");
  if (!isMod) notFound();

  // Mods see every row regardless of status (RLS), so a plain filter works.
  const { data: pendingRows } = await supabase
    .from("artworks")
    .select(
      "id, book_id, chapter_id, image_url, title, artist_handle, credit_url, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pending = pendingRows ?? [];

  // Resolve book titles and chapter numbers in two batched lookups rather than
  // relying on typed nested joins.
  const bookIds = [...new Set(pending.map((a) => a.book_id))];
  const chapterIds = [...new Set(pending.map((a) => a.chapter_id))];

  const bookTitle = new Map<string, string>();
  const chapterLabel = new Map<string, string>();

  if (bookIds.length > 0) {
    const { data: books } = await supabase
      .from("books")
      .select("id, title")
      .in("id", bookIds);
    for (const b of books ?? []) bookTitle.set(b.id, b.title);
  }
  if (chapterIds.length > 0) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, number, title")
      .in("id", chapterIds);
    for (const c of chapters ?? []) {
      chapterLabel.set(
        c.id,
        c.title ? `Ch. ${c.number} · ${c.title}` : `Ch. ${c.number}`,
      );
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
          style={{ color: "var(--ember-soft)", marginBottom: 6 }}
        >
          moderation
        </p>
        <h1
          className="font-display text-[24px] leading-tight font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          Pending art
        </h1>
        <p className="mt-1 mb-6 text-[13px]" style={{ color: "var(--muted)" }}>
          {pending.length === 0
            ? "Nothing waiting — the queue is clear."
            : `${pending.length} ${
                pending.length === 1 ? "piece" : "pieces"
              } awaiting review.`}
        </p>

        <ul className="flex flex-col gap-4">
          {pending.map((art) => (
            <li
              key={art.id}
              className="overflow-hidden rounded-[var(--radius-sm)]"
              style={{
                border: "1px solid var(--line)",
                background: "var(--obsidian-2)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art.image_url}
                alt={art.title ?? "Submitted art"}
                className="max-h-[420px] w-full object-contain"
                style={{ background: "var(--obsidian-3)" }}
              />
              <div className="p-3.5">
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {art.title || "Untitled"}
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {bookTitle.get(art.book_id) ?? "Unknown book"}
                  {" · "}
                  {chapterLabel.get(art.chapter_id) ?? "Unknown chapter"}
                </p>
                {art.artist_handle ? (
                  <p
                    className="mt-0.5 text-[12.5px]"
                    style={{ color: "var(--muted)" }}
                  >
                    Artist: {art.artist_handle}
                  </p>
                ) : null}
                {art.credit_url ? (
                  <a
                    href={art.credit_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-0.5 inline-block text-[12.5px] underline"
                    style={{ color: "var(--ember-soft)" }}
                  >
                    Source link
                  </a>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <form action={approveArt}>
                    <input type="hidden" name="artworkId" value={art.id} />
                    <input type="hidden" name="bookId" value={art.book_id} />
                    <button
                      type="submit"
                      className="h-9 rounded-full px-4 text-[12.5px] font-semibold"
                      style={{ background: "var(--ember)", color: "#fff" }}
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectArt}>
                    <input type="hidden" name="artworkId" value={art.id} />
                    <input type="hidden" name="bookId" value={art.book_id} />
                    <button
                      type="submit"
                      className="h-9 rounded-full px-4 text-[12.5px] font-semibold"
                      style={{
                        border: "1px solid var(--line-2)",
                        background: "var(--obsidian-3)",
                        color: "var(--wine-soft)",
                      }}
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mt-8 inline-block text-[12.5px]"
          style={{ color: "var(--muted)" }}
        >
          ← Library
        </Link>
      </main>
    </div>
  );
}
