import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../_components/site-header";
import { ModerationQueue, type QueueItem } from "./queue";
import { ReportedQueue, type ReportItem } from "./reported";
import { ApplicationsQueue, type ApplicationItem } from "./applications";

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

  // Reader-filed reports (only mods can read these, per RLS).
  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, artwork_id, reported_by, reason, created_at")
    .order("created_at", { ascending: true });
  const reports = reportRows ?? [];

  // "Become a mod" applications from the public /apply form (mods only, per RLS).
  const { data: applicationRows } = await supabase
    .from("mod_applications")
    .select("id, name, email, role, reason, created_at")
    .order("created_at", { ascending: true });
  const applications: ApplicationItem[] = (applicationRows ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    reason: a.reason,
    createdAt: a.created_at,
  }));

  // Pull the reported artworks' details in one lookup.
  const reportedArtIds = [...new Set(reports.map((r) => r.artwork_id))];
  const reportedArt = new Map<
    string,
    {
      id: string;
      book_id: string;
      chapter_id: string;
      image_url: string;
      title: string | null;
      uploaded_by: string | null;
    }
  >();
  if (reportedArtIds.length > 0) {
    const { data: arts } = await supabase
      .from("artworks")
      .select("id, book_id, chapter_id, image_url, title, uploaded_by")
      .in("id", reportedArtIds);
    for (const a of arts ?? []) reportedArt.set(a.id, a);
  }

  // Resolve book titles, chapter labels, and people's names in batched lookups
  // that cover both queues.
  const bookIds = [
    ...new Set([
      ...pending.map((a) => a.book_id),
      ...[...reportedArt.values()].map((a) => a.book_id),
    ]),
  ];
  const chapterIds = [
    ...new Set([
      ...pending.map((a) => a.chapter_id),
      ...[...reportedArt.values()].map((a) => a.chapter_id),
    ]),
  ];
  const personIds = [
    ...new Set(
      [
        ...pending.map((a) => a.uploaded_by),
        ...[...reportedArt.values()].map((a) => a.uploaded_by),
        ...reports.map((r) => r.reported_by),
      ].filter(Boolean) as string[],
    ),
  ];

  const bookTitle = new Map<string, string>();
  const chapterLabel = new Map<string, string>();
  const personName = new Map<string, string>();

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
  if (personIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, handle, display_name")
      .in("id", personIds);
    for (const p of profiles ?? []) {
      personName.set(p.id, p.display_name || p.handle || "a reader");
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
      ? (personName.get(a.uploaded_by) ?? "a reader")
      : "a reader",
  }));

  // Build reported items, skipping any whose artwork has since vanished.
  const reported: ReportItem[] = [];
  for (const r of reports) {
    const art = reportedArt.get(r.artwork_id);
    if (!art) continue;
    reported.push({
      reportId: r.id,
      artworkId: art.id,
      bookId: art.book_id,
      imageUrl: art.image_url,
      title: art.title,
      uploader: art.uploaded_by
        ? (personName.get(art.uploaded_by) ?? "a reader")
        : "a reader",
      reporter: r.reported_by
        ? (personName.get(r.reported_by) ?? "a reader")
        : "a reader",
      reportReason: r.reason,
      bookTitle: bookTitle.get(art.book_id) ?? "Unknown book",
      chapterLabel: chapterLabel.get(art.chapter_id) ?? "Unknown chapter",
    });
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

        {/* Reported art */}
        <section className="mt-10">
          <h2
            className="font-display text-[20px] leading-tight font-medium"
            style={{ color: "var(--silver-bright)" }}
          >
            Reported art
          </h2>
          <p className="mt-1 mb-5 text-[13px]" style={{ color: "var(--muted)" }}>
            {reported.length === 0
              ? "No open reports."
              : `${reported.length} ${
                  reported.length === 1 ? "report" : "reports"
                } from readers. Remove the art or dismiss the report.`}
          </p>
          <ReportedQueue items={reported} />
        </section>

        {/* Mod applications */}
        <section className="mt-10">
          <h2
            className="font-display text-[20px] leading-tight font-medium"
            style={{ color: "var(--silver-bright)" }}
          >
            Mod applications
          </h2>
          <p className="mt-1 mb-5 text-[13px]" style={{ color: "var(--muted)" }}>
            {applications.length === 0
              ? "No applications waiting."
              : `${applications.length} ${
                  applications.length === 1 ? "person wants" : "people want"
                } to help curate. Reach out by email, then mark it handled.`}
          </p>
          <ApplicationsQueue items={applications} />
        </section>

        <Link
          href="/library"
          className="mt-8 inline-block text-[12.5px]"
          style={{ color: "var(--muted)" }}
        >
          ← Library
        </Link>
      </main>
    </div>
  );
}
