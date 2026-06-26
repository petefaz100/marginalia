"use client";

import { useActionState, useRef, useState } from "react";
import { submitArt } from "../books/actions";

type ChapterOption = { id: string; number: number; title: string | null };

type SubmitState = { status: "idle" | "ok" | "error"; error?: string };

// Art submission form: pick a chapter (its spoiler level), choose an image,
// add optional credit. Lives on the book page for signed-in readers. Uploads
// land as 'pending' for a mod to approve.
export function ArtUpload({
  bookId,
  chapters,
}: {
  bookId: string;
  chapters: ChapterOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    async (_prev, formData) => {
      try {
        await submitArt(formData);
        return { status: "ok" };
      } catch (e) {
        return {
          status: "error",
          error: e instanceof Error ? e.message : "Something went wrong.",
        };
      }
    },
    { status: "idle" },
  );

  // After a successful submission, show a confirmation panel instead of the
  // form so the reader gets clear feedback their piece is in the queue.
  if (state.status === "ok") {
    return (
      <div
        className="mt-4 flex flex-col items-start gap-2 rounded-[var(--radius-sm)] p-3.5"
        style={{
          border: "1px solid var(--line)",
          background: "var(--obsidian-2)",
        }}
      >
        <p
          className="text-[11px] tracking-wide uppercase"
          style={{ color: "var(--ember-soft)" }}
        >
          ✓ Submitted
        </p>
        <p className="text-[13px]" style={{ color: "var(--silver)" }}>
          Thanks — your art is in the moderation queue. It&apos;ll appear here
          once a moderator approves it.
        </p>
        <button
          type="button"
          onClick={() => {
            formRef.current?.reset();
            setPreview(null);
            setFileName(null);
            // Reload to reset the action state back to idle and show the form.
            window.location.reload();
          }}
          className="mt-1 text-[12.5px] font-semibold"
          style={{ color: "var(--ember-soft)" }}
        >
          Submit another piece
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 flex flex-col gap-3 rounded-[var(--radius-sm)] p-3.5"
      style={{
        border: "1px solid var(--line)",
        background: "var(--obsidian-2)",
      }}
    >
      <input type="hidden" name="bookId" value={bookId} />

      <p
        className="text-[11px] tracking-wide uppercase"
        style={{ color: "var(--muted)" }}
      >
        Contribute art
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-[12px]" style={{ color: "var(--silver)" }}>
          Chapter (sets the spoiler level)
        </span>
        <select
          name="chapterId"
          required
          defaultValue=""
          className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
          style={{
            border: "1px solid var(--line-2)",
            background: "var(--obsidian-3)",
            color: "var(--silver-bright)",
          }}
        >
          <option value="" disabled>
            Choose a chapter…
          </option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title ? `Ch. ${c.number} · ${c.title}` : `Chapter ${c.number}`}
            </option>
          ))}
        </select>
      </label>

      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] p-4 text-center"
        style={{
          border: "1px dashed var(--line-2)",
          background: "var(--obsidian-3)",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="max-h-[180px] w-auto rounded-[8px] object-contain"
          />
        ) : (
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>
            Tap to choose an image (JPEG, PNG, WebP, GIF · max 8MB)
          </span>
        )}
        {fileName ? (
          <span className="text-[12px]" style={{ color: "var(--silver)" }}>
            {fileName}
          </span>
        ) : null}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              setPreview(URL.createObjectURL(file));
            } else {
              setFileName(null);
              setPreview(null);
            }
          }}
        />
      </label>

      <input
        type="text"
        name="title"
        placeholder="Title (optional)"
        autoComplete="off"
        className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />
      <input
        type="text"
        name="artistHandle"
        placeholder="Artist credit, e.g. @name (optional)"
        autoComplete="off"
        className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />
      <input
        type="url"
        name="creditUrl"
        placeholder="Source link (optional)"
        autoComplete="off"
        className="h-10 w-full rounded-[10px] px-2.5 text-[14px] outline-none"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      />

      {state.status === "error" && state.error ? (
        <p className="text-[12.5px]" style={{ color: "var(--wine-soft)" }}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-60"
        style={{ background: "var(--ember)", color: "#fff" }}
      >
        {pending ? "Uploading…" : "Submit for review"}
      </button>
      <p className="text-[11.5px]" style={{ color: "var(--muted)" }}>
        Submissions are reviewed by a moderator before they appear.
      </p>
    </form>
  );
}
