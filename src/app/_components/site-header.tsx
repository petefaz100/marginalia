import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle, signOut } from "../auth/actions";

function NeedsUsernamePill() {
  return (
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
  );
}

function LeafMark() {
  // The marginalia brand mark: a bookmark with a sparkle, paired with a padlock
  // inside a dashed frame — the "spoiler-gated" idea in one glyph. Served as a
  // transparent PNG so it sits cleanly on the dark header.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marginalia-mark.png"
      alt=""
      width={32}
      height={31}
      className="h-8 w-auto"
      style={{ filter: "drop-shadow(0 0 10px rgba(159,182,224,.35))" }}
    />
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
      <Link
        href="/account"
        className="flex items-center gap-2 rounded-full py-[5px] pr-3 pl-[5px]"
        style={{ border: "1px solid var(--line)", background: "var(--obsidian-2)" }}
        title="Account settings"
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
  let needsUsername = false;
  let unread = 0;
  let pendingCount = 0;
  let applicationsCount = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, username, display_name, avatar_url, is_mod")
      .eq("id", user.id)
      .single();
    // Public-facing label is the chosen username; fall back to the real name
    // only until they've set one (we nudge them to do so right away).
    displayName =
      profile?.username || profile?.display_name || profile?.handle || "reader";
    avatarUrl = profile?.avatar_url;
    isMod = profile?.is_mod ?? false;
    needsUsername = !profile?.username;

    // Everyone gets their unread inbox count (mods too — that's where the
    // "you're now a mod" welcome lands). head:true skips returning rows.
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    unread = unreadCount ?? 0;

    if (isMod) {
      // Mods also get a badge with how many pieces are waiting in the queue.
      const { count } = await supabase
        .from("artworks")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      pendingCount = count ?? 0;

      // The admin's Queue badge also counts waiting "become a mod" applications,
      // since approving them is admin-only. (RLS already hides these rows from
      // non-admin mods, so the count comes back 0 for them regardless.)
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        const { count: appCount } = await supabase
          .from("mod_applications")
          .select("id", { count: "exact", head: true });
        applicationsCount = appCount ?? 0;
      }
    }
  }

  // One badge on Queue covering everything that needs a mod/admin's attention.
  const queueCount = pendingCount + applicationsCount;

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-3"
      style={{
        padding: "16px 0 12px",
        background: "transparent",
      }}
    >
      {/* Full-bleed backdrop: the header content sits inside a centered, padded
          column, so this layer breaks out to the full viewport width (100vw
          centered on the header) to reach both screen edges. A soft gradient +
          blur lets page content fade out as it scrolls underneath. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          width: "100vw",
          transform: "translateX(-50%)",
          background:
            "linear-gradient(180deg, var(--obsidian) 62%, rgba(19,17,25,0))",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <LeafMark />
        <span
          className="font-display text-[23px] leading-none font-semibold tracking-[.2px]"
          style={{ color: "var(--silver-bright)" }}
        >
          margin
          <i className="italic" style={{ color: "var(--ember-soft)" }}>
            alia
          </i>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {user ? (
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
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {unread > 0 ? (
              <span
                className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--ember)", height: 18 }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        ) : null}
        {isMod ? (
          <Link
            href="/moderate"
            className="relative flex h-10 items-center rounded-full px-3.5 text-[13px] font-semibold"
            style={{
              border: "1px solid var(--line)",
              background: "var(--obsidian-2)",
              color: "var(--ember-soft)",
            }}
            aria-label={
              queueCount > 0 ? `Queue (${queueCount} waiting)` : "Queue"
            }
          >
            Queue
            {queueCount > 0 ? (
              <span
                className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--ember)", height: 18 }}
              >
                {queueCount > 9 ? "9+" : queueCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        {needsUsername ? <NeedsUsernamePill /> : null}
        <AuthControl signedIn={!!user} name={displayName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
