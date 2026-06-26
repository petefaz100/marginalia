import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../_components/site-header";
import { MarkReadOnView } from "./mark-read";

export const metadata = { title: "Inbox" };

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function InboxPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // RLS limits this to the reader's own notifications.
  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "id, kind, reason, note, read_at, created_at, artwork:artworks(id, title, book_id, image_url)",
    )
    .order("created_at", { ascending: false });

  const notifications = rows ?? [];
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div
      className="relative mx-auto min-h-screen"
      style={{
        maxWidth: "var(--maxw)",
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <SiteHeader />
      <MarkReadOnView hasUnread={hasUnread} />

      <main style={{ padding: "8px 2px 6px" }}>
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 6 }}
        >
          inbox
        </p>
        <h1
          className="font-display text-[24px] leading-tight font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          Notifications
        </h1>
        <p className="mt-1 mb-6 text-[13px]" style={{ color: "var(--muted)" }}>
          {notifications.length === 0
            ? "Nothing yet — updates on your submitted art will land here."
            : "Updates on the art you've submitted."}
        </p>

        {notifications.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {notifications.map((n) => {
              const art = Array.isArray(n.artwork) ? n.artwork[0] : n.artwork;
              const approved = n.kind === "art_approved";
              const unread = !n.read_at;
              const title = art?.title || "Untitled";
              return (
                <li
                  key={n.id}
                  className="flex gap-3 rounded-[var(--radius-sm)] p-3"
                  style={{
                    border: `1px solid ${unread ? "var(--ember)" : "var(--line)"}`,
                    background: "var(--obsidian-2)",
                  }}
                >
                  {art?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={art.image_url}
                      alt=""
                      className="h-14 w-14 flex-none rounded-[8px] object-cover"
                      style={{ background: "var(--obsidian-3)" }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[11px] tracking-[.12em] uppercase"
                      style={{
                        color: approved
                          ? "var(--ember-soft)"
                          : "var(--wine-soft)",
                      }}
                    >
                      {approved ? "Approved" : "Rejected"}
                      <span
                        className="ml-2 tracking-normal normal-case"
                        style={{ color: "var(--muted)" }}
                      >
                        {timeAgo(n.created_at)}
                      </span>
                    </p>
                    <p
                      className="mt-1 text-[13.5px] font-semibold"
                      style={{ color: "var(--silver-bright)" }}
                    >
                      {approved
                        ? `“${title}” is now live`
                        : `“${title}” wasn't approved`}
                    </p>
                    {!approved && n.reason ? (
                      <p
                        className="mt-0.5 text-[12.5px]"
                        style={{ color: "var(--silver)" }}
                      >
                        Reason: {n.reason}
                      </p>
                    ) : null}
                    {!approved && n.note ? (
                      <p
                        className="mt-0.5 text-[12.5px]"
                        style={{ color: "var(--muted)" }}
                      >
                        {n.note}
                      </p>
                    ) : null}
                    {art?.book_id ? (
                      <Link
                        href={`/books/${art.book_id}`}
                        className="mt-1 inline-block text-[12.5px] underline"
                        style={{ color: "var(--ember-soft)" }}
                      >
                        {approved ? "View on the book page" : "Go to the book"}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

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
