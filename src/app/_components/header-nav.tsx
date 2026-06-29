"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithGoogle, signOut } from "../auth/actions";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#e0683f,#8a3a5b)",
  "linear-gradient(135deg,#6f8fc9,#8a3a5b)",
  "linear-gradient(135deg,#c9a25e,#e0683f)",
  "linear-gradient(135deg,#6db28a,#6f8fc9)",
  "linear-gradient(135deg,#b25c7d,#6f8fc9)",
];

function gradientFor(label: string) {
  const initial = (label.charAt(0) || "r").toUpperCase();
  return AVATAR_GRADIENTS[initial.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

// The mobile hamburger toggle, shared by the signed-in and signed-out headers.
// Shows an ember dot when something behind the menu wants attention.
function HamburgerButton({
  open,
  setOpen,
  attention,
}: {
  open: boolean;
  setOpen: (fn: (v: boolean) => boolean) => void;
  attention: number;
}) {
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="relative grid h-10 w-10 place-items-center rounded-[13px]"
      style={{
        border: "1px solid var(--line)",
        background: "var(--obsidian-2)",
        color: "var(--silver)",
      }}
    >
      {open ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
      {!open && attention > 0 ? (
        <span
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--ember)" }}
        />
      ) : null}
    </button>
  );
}

function Avatar({
  label,
  avatarUrl,
  size = 28,
}: {
  label: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full text-[13px] font-extrabold text-white"
      style={{ width: size, height: size, background: gradientFor(label) }}
    >
      {(label.charAt(0) || "r").toUpperCase()}
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
      style={{ background: "var(--ember)", height: 18 }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

type Props = {
  signedIn: boolean;
  displayName: string;
  avatarUrl?: string | null;
  isMod: boolean;
  needsUsername: boolean;
  unread: number;
  queueCount: number;
};

// The header's right-hand controls. On md+ screens everything sits inline; on
// small screens the links collapse behind a hamburger so they never crowd the
// wordmark.
export function HeaderNav({
  signedIn,
  displayName,
  avatarUrl,
  isMod,
  needsUsername,
  unread,
  queueCount,
}: Props) {
  const [open, setOpen] = useState(false);

  // Signed-out: Library + Sign in inline on desktop; the same two collapse
  // behind the hamburger on mobile, so the menu is consistent at every size.
  if (!signedIn) {
    return (
      <>
        {/* Desktop: inline controls */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/library"
            className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
              color: "var(--silver)",
            }}
            title="Library"
          >
            <BookIcon size={16} />
            Library
          </Link>
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold"
              style={{
                border: "1px solid var(--line)",
                background: "var(--obsidian-2)",
                color: "var(--silver)",
              }}
            >
              Sign in
            </button>
          </form>
        </div>

        {/* Mobile: hamburger toggle */}
        <div className="relative md:hidden">
          <HamburgerButton open={open} setOpen={setOpen} attention={0} />
          {open ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius)] p-1.5"
                style={{
                  border: "1px solid var(--line-2)",
                  background: "var(--obsidian-2)",
                  boxShadow: "0 12px 32px rgba(0,0,0,.45)",
                }}
              >
                <MenuLink
                  href="/library"
                  label="Library"
                  onClick={() => setOpen(false)}
                  icon={<BookIcon />}
                />
                <div className="my-1 h-px" style={{ background: "var(--line)" }} />
                <form action={signInWithGoogle}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold"
                    style={{ color: "var(--ember-soft)" }}
                  >
                    <SignInIcon />
                    Sign in
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </>
    );
  }

  // Anything worth a dot on the closed hamburger (so mobile users know to open).
  const attention = unread + (isMod ? queueCount : 0) + (needsUsername ? 1 : 0);

  return (
    <>
      {/* Desktop: inline controls */}
      <div className="hidden items-center gap-2 md:flex">
        <Link
          href="/library"
          className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--silver)",
          }}
          title="Library"
        >
          <BookIcon size={16} />
          Library
        </Link>
        <Link
          href="/inbox"
          className="relative grid h-10 w-10 place-items-center rounded-[13px]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            color: "var(--silver)",
          }}
          aria-label={unread > 0 ? `Inbox (${unread} unread)` : "Inbox"}
          title="Inbox"
        >
          <InboxIcon />
          <CountBadge count={unread} />
        </Link>
        {isMod ? (
          <Link
            href="/moderate"
            className="relative flex h-10 items-center rounded-full px-3.5 text-[13px] font-semibold"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
              color: "var(--ember-soft)",
            }}
            aria-label={queueCount > 0 ? `Queue (${queueCount} waiting)` : "Queue"}
          >
            Queue
            <CountBadge count={queueCount} />
          </Link>
        ) : null}
        {needsUsername ? (
          <Link
            href="/account"
            className="flex h-10 items-center rounded-full px-3.5 text-[12.5px] font-semibold"
            style={{
              border: "1px solid var(--ember)",
              background: "rgba(224,104,63,.12)",
              color: "var(--ember-soft)",
            }}
            title="Choose a public username to start posting"
          >
            Set username
          </Link>
        ) : null}
        <Link
          href="/account"
          className="flex items-center gap-2 rounded-full py-[5px] pr-3 pl-[5px]"
          style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
          title="Account settings"
        >
          <Avatar label={displayName} avatarUrl={avatarUrl} />
          <span
            className="max-w-[120px] truncate text-[13px] font-semibold"
            style={{ color: "var(--silver)" }}
          >
            {displayName}
          </span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="grid h-10 w-10 place-items-center rounded-[13px]"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
              color: "var(--muted)",
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <SignOutIcon />
          </button>
        </form>
      </div>

      {/* Mobile: hamburger toggle */}
      <div className="relative md:hidden">
        <HamburgerButton open={open} setOpen={setOpen} attention={attention} />

        {open ? (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            {/* Menu panel */}
            <div
              className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius)] p-1.5"
              style={{
                border: "1px solid var(--line-2)",
                background: "var(--obsidian-2)",
                boxShadow: "0 12px 32px rgba(0,0,0,.45)",
              }}
            >
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2"
                style={{ color: "var(--silver-bright)" }}
              >
                <Avatar label={displayName} avatarUrl={avatarUrl} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">
                    {displayName}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--muted)" }}>
                    Account settings
                  </span>
                </span>
              </Link>

              <div className="my-1 h-px" style={{ background: "var(--line)" }} />

              <MenuLink
                href="/library"
                label="Library"
                onClick={() => setOpen(false)}
                icon={<BookIcon />}
              />
              <MenuLink
                href="/inbox"
                label="Inbox"
                count={unread}
                onClick={() => setOpen(false)}
                icon={<InboxIcon />}
              />
              {isMod ? (
                <MenuLink
                  href="/moderate"
                  label="Queue"
                  count={queueCount}
                  onClick={() => setOpen(false)}
                  emphasis
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h7v7H3z" />
                      <path d="M14 3h7v7h-7z" />
                      <path d="M14 14h7v7h-7z" />
                      <path d="M3 14h7v7H3z" />
                    </svg>
                  }
                />
              ) : null}
              {needsUsername ? (
                <MenuLink
                  href="/account"
                  label="Set username"
                  onClick={() => setOpen(false)}
                  emphasis
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                />
              ) : null}

              <div className="my-1 h-px" style={{ background: "var(--line)" }} />

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold"
                  style={{ color: "var(--muted)" }}
                >
                  <SignOutIcon />
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function MenuLink({
  href,
  label,
  count = 0,
  emphasis = false,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  count?: number;
  emphasis?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold"
      style={{ color: emphasis ? "var(--ember-soft)" : "var(--silver)" }}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count > 0 ? (
        <span
          className="grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ background: "var(--ember)", height: 18 }}
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
