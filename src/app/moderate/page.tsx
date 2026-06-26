import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../_components/site-header";
import { ModerationQueue, type QueueItem } from "./queue";

export const metadata = { title: "Moderation" };

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
      "id, book_id, chapter_id, image_url, title, artist_handle, credit_url, uploaded_by, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pending = pendingRows ?? [];

  // Resolve book titles, chapter labels, and uploader names in batched lookups.
  const bookIds = [...new Set(pending.map((a) => a.book_id))];
  const chapterIds = [...new Set(pending.map((a) => a.chapter_id))];
  const uploaderIds = [
    ...new Set(pending.map((a) => a.uploaded_by).filter(Boolean) as string[]),
  ];

  const bookTitle = new Map<string, string>();
  const chapterLabel = new Map<string, string>();
  const uploaderName = new Map<string, string>();

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
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .in("id", uploaderIds);
    for (const p of profiles ?? []) {
      uploaderName.set(p.id, p.display_name || p.handle || "a reader");
    }
  }

  const items: QueueItem[] = pending.map((a) => ({
    id: a.id,
    bookId: a.book_id,
    imageUrl: a.image_url,
    title: a.title,
    artistHandle: a.artist_handle,
    creditUrl: a.credit_url,
    bookTitle: bookTitle.get(a.book_id) ?? "Unknown book",
    chapterLabel: chapterLabel.get(a.chapter_id) ?? "Unknown chapter",
    uploader: a.uploaded_by
      ? (uploaderName.get(a.uploaded_by) ?? "a reader")
      : "a reader",
  }));

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
          {items.length === 0
            ? "Nothing waiting — the queue is clear."
            : `${items.length} ${
                items.length === 1 ? "piece" : "pieces"
              } awaiting review. Select several to approve or reject at once.`}
        </p>

        <ModerationQueue items={items} />

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
