"use client";

import { useState, useTransition } from "react";
import type { ModApplicantRole } from "@/lib/supabase/types";
import { submitApplication } from "./actions";

const ROLE_OPTIONS: { value: ModApplicantRole; label: string }[] = [
  { value: "artist", label: "Artist" },
  { value: "author", label: "Author" },
  { value: "reader", label: "Reader" },
];

const inputStyle = {
  border: "1px solid var(--line-2)",
  background: "var(--obsidian-3)",
  color: "var(--silver-bright)",
} as const;

// The "apply to be a mod" form: name, why, and which role best describes the
// applicant. The applicant must be signed in (enforced on the page), so the
// email is taken from their account — shown here read-only, never typed —
// which guarantees accepting them finds the right account. On submit it posts
// to the mod queue and shows a thank-you state in place of the form.
export function ApplyForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [name, setName] = useState(defaultName);
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<ModApplicantRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const canSubmit = name.trim() && reason.trim() && role && !pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const fd = new FormData();
    fd.set("name", name);
    fd.set("reason", reason);
    fd.set("role", role);
    start(async () => {
      const res = await submitApplication(fd);
      if (res.ok) {
        setDone(true);
        setError(null);
      } else {
        setError(res.message ?? "Couldn't send that.");
      }
    });
  }

  if (done) {
    return (
      <div
        className="rounded-[var(--radius)] p-4"
        style={{
          border: "1px solid var(--ember)",
          background: "rgba(224,104,63,.10)",
        }}
      >
        <p
          className="font-display text-[16px] font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          Thanks — your application is in.
        </p>
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--silver)" }}>
          The mods will review it and reach out by email if it&apos;s a fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--silver)" }}>
          Your name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          className="h-11 rounded-[var(--radius-sm)] px-3 text-[15px] outline-none"
          style={inputStyle}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--silver)" }}>
          Email
        </span>
        <div
          className="flex h-11 items-center rounded-[var(--radius-sm)] px-3 text-[15px]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--muted)",
          }}
        >
          {email || "your account email"}
        </div>
        <span className="text-[11.5px]" style={{ color: "var(--muted-2)" }}>
          Tied to your account — this is where we&apos;ll reach you.
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--silver)" }}>
          Why would you like to be a mod?
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={4000}
          className="resize-y rounded-[var(--radius-sm)] px-3 py-2.5 text-[14px] outline-none"
          style={inputStyle}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[12.5px] font-semibold" style={{ color: "var(--silver)" }}>
          Which best describes you?
        </legend>
        {ROLE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5"
            style={{
              border:
                role === opt.value
                  ? "1px solid var(--ember)"
                  : "1px solid var(--line-2)",
              background:
                role === opt.value ? "rgba(224,104,63,.10)" : "var(--obsidian-3)",
            }}
          >
            <input
              type="radio"
              name="role"
              value={opt.value}
              checked={role === opt.value}
              onChange={() => setRole(opt.value)}
              className="accent-[var(--ember)]"
            />
            <span className="text-[14px]" style={{ color: "var(--silver-bright)" }}>
              {opt.label}
            </span>
          </label>
        ))}
      </fieldset>

      {error ? (
        <p className="text-[12.5px]" style={{ color: "var(--wine-soft)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 h-11 self-start rounded-full px-5 text-[14px] font-semibold disabled:opacity-50"
        style={{ background: "var(--ember)", color: "#fff" }}
      >
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
