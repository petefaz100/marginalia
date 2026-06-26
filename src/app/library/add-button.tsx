"use client";

import { useFormStatus } from "react-dom";

// A small spinning ring shown while the add-book action is in flight.
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// The "Add" button for a search result. Lives in its own client component so it
// can read useFormStatus and show a spinner while the book is being added —
// otherwise a tap sits there doing nothing until the page reloads.
export function AddButton({
  signedIn,
  alreadyAdded,
}: {
  signedIn: boolean;
  alreadyAdded: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = !signedIn || alreadyAdded || pending;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold disabled:cursor-default"
      style={
        alreadyAdded
          ? {
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--muted-2)",
            }
          : {
              border: "1px solid var(--line-2)",
              background: "var(--obsidian-3)",
              color: signedIn ? "var(--ember-soft)" : "var(--muted-2)",
            }
      }
    >
      {pending ? <Spinner /> : null}
      {alreadyAdded ? "Added" : pending ? "Adding…" : "Add"}
    </button>
  );
}
