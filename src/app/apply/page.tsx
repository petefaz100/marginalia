import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "../auth/actions";
import { SiteHeader } from "../_components/site-header";
import { ApplyForm } from "./apply-form";

export const metadata = {
  title: "Apply to be a mod — marginalia",
  description:
    "Help curate spoiler-safe art for your favorite books. Tell the mods a little about yourself.",
};

// Signed-out visitors see a prompt to sign in first. Tying applications to a
// real account means the email always matches a user, so accepting an applicant
// reliably finds and promotes them — no typos, no orphaned applications.
function SignInPrompt() {
  return (
    <div className="flex flex-col gap-3">
      <p
        className="font-display text-[16px] font-medium"
        style={{ color: "var(--silver-bright)" }}
      >
        Sign in to apply
      </p>
      <p className="text-[13.5px]" style={{ color: "var(--silver)" }}>
        Becoming a mod is tied to your marginalia account, so sign in first. It
        only takes a moment, and we&apos;ll bring you right back here.
      </p>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value="/apply" />
        <button
          type="submit"
          className="mt-1 flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          Sign in with Google
        </button>
      </form>
    </div>
  );
}

export default async function ApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, handle")
      .eq("id", user.id)
      .single();
    defaultName =
      profile?.display_name || profile?.username || profile?.handle || "";
  }

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] md:max-w-[680px]"
      style={{ padding: "0 18px calc(40px + env(safe-area-inset-bottom))" }}
    >
      <SiteHeader />

      <main style={{ padding: "8px 2px 6px" }} className="pt-4">
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 6 }}
        >
          apply to be a mod
        </p>
        <h1
          className="font-display text-[24px] leading-tight font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          Help curate your favorite book
        </h1>
        <p className="mt-1 mb-5 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Mods approve art, keep chapters spoiler-safe, and look after the
          discussion. Tell us a little about yourself and we&apos;ll be in touch.
        </p>

        <div
          className="rounded-[var(--radius)] p-4"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
          }}
        >
          {user ? (
            <ApplyForm defaultName={defaultName} email={user.email ?? ""} />
          ) : (
            <SignInPrompt />
          )}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-[12.5px]"
          style={{ color: "var(--muted)" }}
        >
          ← Home
        </Link>
      </main>
    </div>
  );
}
