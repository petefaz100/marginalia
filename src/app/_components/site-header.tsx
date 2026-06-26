import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderNav } from "./header-nav";

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

      <HeaderNav
        signedIn={!!user}
        displayName={displayName ?? "reader"}
        avatarUrl={avatarUrl}
        isMod={isMod}
        needsUsername={needsUsername}
        unread={unread}
        queueCount={queueCount}
      />
    </header>
  );
}
