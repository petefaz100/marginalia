"use client";

import { useState, useTransition } from "react";
import { dismissReport, moderateArt } from "./actions";
import { REJECT_REASONS } from "./reasons";

export type ReportItem = {
  reportId: string;
  artworkId: string;
  bookId: string;
  imageUrl: string;
  title: string | null;
  uploader: string;
  reporter: string;
  reportReason: string | null;
  bookTitle: string;
  chapterLabel: string;
};

// The reported-art queue: approved pieces a reader flagged. A mod can REMOVE the
// art (deletes it + tells the uploader why) or DISMISS the report (keeps the art
// and clears the flag).
export function ReportedQueue({ items }: { items: ReportItem[] }) {
  const [pending, startTransition] = useTransition();
  // The artwork id we're currently choosing a removal reason for.
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState("");

  if (items.length === 0) return null;

  function dismiss(reportId: string) {
    startTransition(async () => {
      await dismissReport(reportId);
    });
  }

  function confirmRemove(item: ReportItem) {
    startTransition(async () => {
      await moderateArt([item.artworkId], "rejected", [item.bookId], {
        [item.artworkId]: { reason, note },
      });
      setRemoving(null);
      setReason(REJECT_REASONS[0]);
      setNote("");
    });
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const isRemoving = removing === item.artworkId;
        return (
          <li
            key={item.reportId}
            className="overflow-hidden rounded-[var(--radius-sm)]"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
            }}
          >
            <div className="flex gap-3 p-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title ?? "Reported art"}
                className="h-20 w-20 flex-none rounded-[8px] object-cover"
                style={{ background: "var(--obsidian-3)" }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {item.title || "Untitled"}
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  {item.bookTitle} · {item.chapterLabel}
                </p>
                <p
                  className="mt-0.5 text-[12.5px]"
                  style={{ color: "var(--muted)" }}
                >
                  Submitted by {item.uploader}
                </p>
                <p
                  className="mt-1.5 text-[12.5px]"
                  style={{ color: "var(--wine-soft)" }}
                >
                  Reported by {item.reporter}
                  {item.reportReason ? `: “${item.reportReason}”` : ""}
                </p>
              </div>
            </div>

            {isRemoving ? (
              <div
                className="flex flex-col gap-2 px-3.5 pb-3.5"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <p
                  className="mt-3 text-[12px]"
                  style={{ color: "var(--silver)" }}
                >
                  Reason the uploader will see:
                </p>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 w-full rounded-[8px] px-2 text-[13px] outline-none"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--silver-bright)",
                  }}
                >
                  {REJECT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note (optional)"
                  className="w-full resize-none rounded-[8px] px-2 py-1.5 text-[13px] outline-none"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--silver-bright)",
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setRemoving(null)}
                    className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                    style={{
                      border: "1px solid var(--line-2)",
                      background: "var(--obsidian-3)",
                      color: "var(--silver)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirmRemove(item)}
                    className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                    style={{ background: "var(--wine)", color: "#fff" }}
                  >
                    {pending ? "Removing…" : "Remove art"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex gap-2 px-3.5 pb-3.5"
                style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setRemoving(item.artworkId);
                    setReason(REJECT_REASONS[0]);
                    setNote("");
                  }}
                  className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--wine-soft)",
                  }}
                >
                  Remove art
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => dismiss(item.reportId)}
                  className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--obsidian-3)",
                    color: "var(--silver)",
                  }}
                >
                  Dismiss report
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
