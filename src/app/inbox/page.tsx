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

  // RLS limits this to the reader's own notifications. The art's title/image and
  // book are stored on the notification itself, so a rejected (deleted) piece
  // still shows a thumbnail here.
  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "id, kind, reason, note, art_title, art_image_url, book_id, actor_id, thread_id, comment_id, chapter_number, read_at, created_at",
    )
    .order("created_at", { ascending: false });

  const notifications = rows ?? [];
  const hasUnread = notifications.some((n) => !n.read_at);

  // For reply notifications we resolve a few referenced names: who replied
  // (their public username), the thread title, and the book title. Batched so a
  // long inbox is still one round trip per kind of lookup.
  const replies = notifications.filter(
    (n) => n.kind === "reply_thread" || n.kind === "reply_comment",
  );
  const actorIds = [
    ...new Set(replies.map((n) => n.actor_id).filter((x): x is string => !!x)),
  ];
  const threadIds = [
    ...new Set(replies.map((n) => n.thread_id).filter((x): x is string => !!x)),
  ];
  const bookIds = [
    ...new Set(replies.map((n) => n.book_id).filter((x): x is string => !!x)),
  ];

  const actorName = new Map<string, string>();
  if (actorIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", actorIds);
    for (const p of data ?? []) actorName.set(p.id, p.username || "someone");
  }
  const threadTitle = new Map<string, string>();
  if (threadIds.length) {
    const { data } = await supabase
      .from("threads")
      .select("id, title")
      .in("id", threadIds);
    for (const t of data ?? []) threadTitle.set(t.id, t.title);
  }
  const bookTitle = new Map<string, string>();
  if (bookIds.length) {
    const { data } = await supabase
      .from("books")
      .select("id, title")
      .in("id", bookIds);
    for (const b of data ?? []) bookTitle.set(b.id, b.title);
  }

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] md:max-w-[680px]"
      style={{
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
            ? "Nothing yet — replies to your posts and updates on your submitted art will land here."
            : "Replies to your threads and comments, plus updates on the art you've submitted."}
        </p>

        {notifications.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {notifications.map((n) => {
              const unread = !n.read_at;

              // Reply notifications: someone responded to the reader's thread or
              // comment. Show who, where (book + chapter), and link to the book.
              if (n.kind === "reply_thread" || n.kind === "reply_comment") {
                const who = (n.actor_id && actorName.get(n.actor_id)) || "Someone";
                const book = n.book_id ? bookTitle.get(n.book_id) : null;
                const chapterBit =
                  n.chapter_number != null ? `chapter ${n.chapter_number}` : null;
                const message =
                  n.kind === "reply_comment"
                    ? `${who} replied to your comment${
                        chapterBit ? ` in ${chapterBit}` : ""
                      }`
                    : `${who} replied to your thread${
                        n.thread_id && threadTitle.get(n.thread_id)
                          ? `: “${threadTitle.get(n.thread_id)}”`
                          : ""
                      }`;
                return (
                  <li
                    key={n.id}
                    className="flex gap-3 rounded-[var(--radius-sm)] p-3"
                    style={{
                      border: `1px solid ${unread ? "var(--ember)" : "var(--line)"}`,
                      background: "var(--obsidian-2)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[11px] tracking-[.12em] uppercase"
                        style={{ color: "var(--violet-soft)" }}
                      >
                        Reply
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
                        {message}
                      </p>
                      {book ? (
                        <p
                          className="mt-0.5 text-[12.5px]"
                          style={{ color: "var(--muted)" }}
                        >
                          on {book}
                        </p>
                      ) : null}
                      {n.book_id ? (
                        <Link
                          href={`/books/${n.book_id}`}
                          className="mt-1 inline-block text-[12.5px] underline"
                          style={{ color: "var(--ember-soft)" }}
                        >
                          View the discussion
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              }

              // Mod granted: this reader's application was accepted and they
              // now have mod abilities (including the moderation queue).
              if (n.kind === "mod_granted") {
                return (
                  <li
                    key={n.id}
                    className="flex gap-3 rounded-[var(--radius-sm)] p-3"
                    style={{
                      border: `1px solid ${unread ? "var(--ember)" : "var(--line)"}`,
                      background: "var(--obsidian-2)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[11px] tracking-[.12em] uppercase"
                        style={{ color: "var(--ember-soft)" }}
                      >
                        Mod access
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
                        You&apos;re now a mod — welcome to the team.
                      </p>
                      <p
                        className="mt-0.5 text-[12.5px]"
                        style={{ color: "var(--silver)" }}
                      >
                        You can review submitted art and applications from the
                        moderation queue.
                      </p>
                      <Link
                        href="/moderate"
                        className="mt-1 inline-block text-[12.5px] underline"
                        style={{ color: "var(--ember-soft)" }}
                      >
                        Open the queue
                      </Link>
                    </div>
                  </li>
                );
              }

              const approved = n.kind === "art_approved";
              const title = n.art_title || "Untitled";
              return (
                <li
                  key={n.id}
                  className="flex gap-3 rounded-[var(--radius-sm)] p-3"
                  style={{
                    border: `1px solid ${unread ? "var(--ember)" : "var(--line)"}`,
                    background: "var(--obsidian-2)",
                  }}
                >
                  {n.art_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.art_image_url}
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
                    {approved && n.book_id ? (
                      <Link
                        href={`/books/${n.book_id}`}
                        className="mt-1 inline-block text-[12.5px] underline"
                        style={{ color: "var(--ember-soft)" }}
                      >
                        View on the book page
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

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
