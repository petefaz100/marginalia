"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkUsername, setUsername } from "./actions";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  validateUsername,
} from "@/lib/username";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

type ServerResult = { name: string; ok: boolean; message: string };

// Username chooser used for both first-time setup and later changes. Gives live
// feedback: as the reader types, we shape-check locally, then (debounced) ask
// the server whether the name is free. The Save button stays disabled until the
// name is known-available.
export function UsernameForm({
  current,
  redirectTo,
}: {
  current: string | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  // The server's answer, tagged with the exact name it answers for so a stale
  // result for an older keystroke is simply ignored when we derive `avail`.
  const [server, setServer] = useState<ServerResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);

  // The synchronous parts of availability (unchanged name, shape errors) are
  // derived during render — no effect needed. Only the network lookup lives in
  // the effect, and it sets state solely inside the async callback, so we never
  // call setState synchronously while rendering/effecting.
  const trimmed = value.trim();
  const unchanged = trimmed === (current ?? "");
  const shapeError = unchanged ? null : validateUsername(trimmed);

  // Debounced server check. A sequence counter drops stale responses so a slow
  // earlier request can't overwrite a newer answer.
  useEffect(() => {
    if (unchanged || shapeError) return;
    const name = trimmed;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const res = await checkUsername(name);
      if (mine !== seq.current) return; // a newer keystroke superseded this
      setServer({ name, ok: res.ok, message: res.message });
    }, 350);
    return () => clearTimeout(t);
  }, [trimmed, unchanged, shapeError]);

  // Derive what to show from the current input + the latest matching answer.
  const avail: Availability = unchanged
    ? { state: "idle" }
    : shapeError
      ? { state: "error", message: shapeError }
      : server && server.name === trimmed
        ? server.ok
          ? { state: "ok", message: server.message }
          : { state: "error", message: server.message }
        : { state: "checking" };

  const canSave =
    avail.state === "ok" || (current !== null && value.trim() === current);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    startTransition(async () => {
      const res = await setUsername(value);
      if (res.ok) {
        setSaved(true);
        setSaveError(null);
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        } else {
          router.refresh();
        }
      } else {
        setSaveError(res.message);
        setSaved(false);
      }
    });
  }

  const hintColor =
    avail.state === "ok"
      ? "var(--ok)"
      : avail.state === "error"
        ? "var(--wine-soft)"
        : "var(--muted)";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
        }}
      >
        <span className="text-[15px]" style={{ color: "var(--muted)" }}>
          @
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            // Clear any stale "saved" / error state as soon as they edit.
            setSaved(false);
            setSaveError(null);
          }}
          placeholder="your_username"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={USERNAME_MAX}
          aria-label="Username"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          style={{ color: "var(--silver-bright)" }}
        />
        {avail.state === "checking" ? (
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            checking…
          </span>
        ) : avail.state === "ok" ? (
          <span className="text-[14px]" style={{ color: "var(--ok)" }}>
            ✓
          </span>
        ) : null}
      </div>

      <p className="min-h-[18px] text-[12.5px]" style={{ color: hintColor }}>
        {avail.state === "ok" || avail.state === "error"
          ? avail.message
          : `${USERNAME_MIN}–${USERNAME_MAX} characters · letters, numbers, underscores, hyphens`}
      </p>

      {saveError ? (
        <p className="text-[12.5px]" style={{ color: "var(--wine-soft)" }}>
          {saveError}
        </p>
      ) : null}
      {saved ? (
        <p className="text-[12.5px]" style={{ color: "var(--ok)" }}>
          Username saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSave || pending}
        className="mt-1 h-11 self-start rounded-full px-5 text-[14px] font-semibold disabled:opacity-50"
        style={{ background: "var(--ember)", color: "#fff" }}
      >
        {pending ? "Saving…" : current ? "Save username" : "Claim username"}
      </button>
    </form>
  );
}
