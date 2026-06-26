"use client";

import { useEffect, useTransition } from "react";
import { markAllRead } from "./actions";

// Clears the unread state once the reader has actually opened the inbox. Runs
// once on mount; the list above was rendered with the pre-read styling so they
// still see which items were new this visit.
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!hasUnread) return;
    startTransition(() => {
      void markAllRead();
    });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
