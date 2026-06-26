"use client";

import { useState, useTransition } from "react";
import type { ModApplicantRole } from "@/lib/supabase/types";
import { acceptApplication, rejectApplication } from "./actions";

export type ApplicationItem = {
  id: string;
  name: string;
  email: string;
  role: ModApplicantRole;
  reason: string;
  createdAt: string;
};

const ROLE_LABEL: Record<ModApplicantRole, string> = {
  artist: "Artist",
  author: "Author",
  reader: "Reader",
};

// The "become a mod" applications queue. Each card shows who applied, how to
// reach them, and what they said. Accepting grants mod abilities to the account
// with the matching email and notifies them; rejecting clears the application.
export function ApplicationsQueue({ items }: { items: ApplicationItem[] }) {
  const [pending, startTransition] = useTransition();
  // Per-application error (e.g. "no account with that email yet").
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) return null;

  function accept(id: string) {
    startTransition(async () => {
      const res = await acceptApplication(id);
      if (!res.ok) {
        setErrors((e) => ({ ...e, [id]: res.message }));
      } else {
        setErrors((e) => {
          const next = { ...e };
          delete next[id];
          return next;
        });
      }
    });
  }

  function reject(id: string) {
    startTransition(async () => {
      await rejectApplication(id);
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
            {errors[item.id] ? (
              <p
                className="mt-2 text-[12.5px]"
                style={{ color: "var(--wine-soft)" }}
              >
                {errors[item.id]}
              </p>
            ) : null}
          </div>

          <div
            className="flex gap-2 px-3.5 pb-3.5"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => accept(item.id)}
              className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
              style={{ background: "var(--ember)", color: "#fff" }}
            >
              {pending ? "Working…" : "Accept"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => reject(item.id)}
              className="h-9 rounded-full px-4 text-[12.5px] font-semibold disabled:opacity-50"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-3)",
                color: "var(--wine-soft)",
              }}
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
