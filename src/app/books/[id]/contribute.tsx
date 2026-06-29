"use client";

import { useState } from "react";
import { addChapter } from "../actions";
import { ArtUpload } from "../../_components/art-upload";

type Chapter = { id: string; number: number; title: string | null };

// A single collapsed "Contribute" disclosure that hides the add-a-chapter and
// add-art forms until a reader actually wants them — so the book page stays a
// calm reading view by default instead of leading with two forms.
export function Contribute({
  bookId,
  chapters,
  isMod = false,
}: {
  bookId: string;
  chapters: Chapter[];
  isMod?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const nextNumber =
    chapters.length > 0 ? chapters[chapters.length - 1].number + 1 : 1;

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
        style={
          open
            ? {
                border: "1px solid var(--line)",
                background: "var(--obsidian-2)",
                color: "var(--silver)",
              }
            : { background: "var(--ember)", color: "#fff" }
        }
      >
        {open ? "Close" : "+ Contribute"}
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-4">
          {/* Add a chapter — borderless, fields sit straight on the page. */}
          <form action={addChapter} className="flex items-end gap-2">
            <input type="hidden" name="bookId" value={bookId} />
            <label className="shrink-0">
              <span
                className="mb-1 block text-[11px] tracking-wide uppercase"
                style={{ color: "var(--muted)" }}
              >
                No.
              </span>
              <input
                type="number"
                name="number"
                min={1}
                defaultValue={nextNumber}
                className="h-10 w-16 rounded-[10px] px-2.5 text-[14px] outline-none"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: "var(--silver-bright)",
                }}
              />
            </label>
            <label className="min-w-0 flex-1">
              <span
                className="mb-1 block text-[11px] tracking-wide uppercase"
                style={{ color: "var(--muted)" }}
              >
                Chapter title (optional)
              </span>
              <input
                type="text"
                name="title"
                placeholder="e.g. The Shattered Sea"
                autoComplete="off"
                className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-3)",
                  color: "var(--silver-bright)",
                }}
              />
            </label>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-[10px] px-4 text-[13px] font-semibold"
              style={{ background: "var(--ember)", color: "#fff" }}
            >
              Add
            </button>
          </form>

          {/* Add art */}
          {chapters.length > 0 ? (
            <ArtUpload bookId={bookId} chapters={chapters} isMod={isMod} />
          ) : (
            <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>
              Add a chapter first, then you can upload art to it.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
