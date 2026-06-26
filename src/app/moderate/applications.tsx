"use client";

import { useTransition } from "react";
import type { ModApplicantRole } from "@/lib/supabase/types";
import { dismissApplication } from "./actions";

export type ApplicationItem = {
  id: string;
  name: string;
  email: string;
  role: ModApplicantRole;
  reason: string;
  createdAt: string;
};

const ROLE_LABEL: Record<ModApplicantRole, string> = {
  book_artist: "Book artist",
  artist_or_author: "Artist or author",
  reader: "Reader",
};

// The "become a mod" applications queue. Each card shows who applied, how to
// reach them, what they said, and a single "Mark handled" control that clears
// the application once a mod has followed up.
export function ApplicationsQueue({ items }: { items: ApplicationItem[] }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function handled(id: string) {
    startTransition(async () => {
      await dismissApplication(id);
    });
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="overflow-hidden rounded-[var(--radius-sm)]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
          }}
        >
          <div className="p-3.5">
            <div className="flex items-center gap-2">
              <p
                className="text-[14px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                {item.name}
              </p>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "var(--obsidian-3)",
                  color: "var(--ember-soft)",
                }}
              >
                {ROLE_LABEL[item.role]}
              </span>
            </div>
            <a
              href={`mailto:${item.email}`}
              className="mt-0.5 inline-block text-[12.5px]"
              style={{ color: "var(--ember-soft)" }}
            >
              {item.email}
            </a>
            <p
              className="mt-2 text-[13.5px] whitespace-pre-wrap"
              style={{ color: "var(--silver)" }}
            >
              {item.reason}
            </p>
          </div>

          <div
            className="flex justify-end px-3.5 pb-3.5"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => handled(item.id)}
              className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--silver)",
              }}
            >
              {pending ? "Clearing…" : "Mark handled"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
