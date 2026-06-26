import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle, signOut } from "../auth/actions";

function LeafMark() {
  return (
    <svg
      width="30"
      height="42"
      viewBox="0 0 40 56"
      fill="none"
      style={{ filter: "drop-shadow(0 0 10px rgba(159,182,224,.35))" }}
    >
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe6f2" />
          <stop offset="1" stopColor="#6f8fc9" />
        </linearGradient>
      </defs>
      <path
        d="M20 4c2 8-4 11-4 18 0 4 2 6 2 9-3-1-5-4-5-8-4 4-6 9-6 14 0 8 6 14 13 14s13-6 13-14c0-9-7-12-9-21-1-4 1-7 1-12-3 2-5 5-5 9 0 0-1-9 5-19z"
        fill="url(#leaf)"
      />
    </svg>
  );
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#e0683f,#8a3a5b)",
  "linear-gradient(135deg,#6f8fc9,#8a3a5b)",
  "linear-gradient(135deg,#c9a25e,#e0683f)",
  "linear-gradient(135deg,#6db28a,#6f8fc9)",
  "linear-gradient(135deg,#b25c7d,#6f8fc9)",
];

function AuthControl({
  signedIn,
  name,
  avatarUrl,
}: {
  signedIn: boolean;
  name?: string;
  avatarUrl?: string | null;
}) {
  if (!signedIn) {
    return (
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
    );
  }

  const label = name || "reader";
  const initial = label.charAt(0).toUpperCase();
  const gradient =
    AVATAR_GRADIENTS[initial.charCodeAt(0) % AVATAR_GRADIENTS.length];

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 rounded-full py-[5px] pr-3 pl-[5px]"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span
            className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-extrabold text-white"
            style={{ background: gradient }}
          >
            {initial}
          </span>
        )}
        <span
          className="max-w-[120px] truncate text-[13px] font-semibold"
          style={{ color: "var(--silver)" }}
        >
          {label}
        </span>
      </div>
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// Shared top bar: brand wordmark (links home) + auth state. Fetches the signed-in
// reader on its own so any page can drop it in without threading auth props.
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | undefined;
  let avatarUrl: string | null | undefined;
  let isMod = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, display_name, avatar_url, is_mod")
      .eq("id", user.id)
      .single();
    displayName =
      profile?.display_name || profile?.handle || user.email || "reader";
    avatarUrl = profile?.avatar_url;
    isMod = profile?.is_mod ?? false;
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-3"
      style={{
        padding: "16px 0 12px",
        background:
          "linear-gradient(180deg, var(--obsidian) 62%, rgba(19,17,25,0))",
      }}
    >
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <LeafMark />
        <span
          className="font-display text-[23px] leading-none font-semibold tracking-[.2px]"
          style={{ color: "var(--silver-bright)" }}
        >
          margi
          <i className="italic" style={{ color: "var(--ember-soft)" }}>
            nalia
          </i>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {isMod ? (
          <Link
            href="/moderate"
            className="flex h-10 items-center rounded-full px-3.5 text-[13px] font-semibold"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
              color: "var(--ember-soft)",
            }}
          >
            Queue
          </Link>
        ) : null}
        <AuthControl signedIn={!!user} name={displayName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
