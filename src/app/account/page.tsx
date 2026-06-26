import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "../_components/site-header";
import { UsernameForm } from "./username-form";

export const metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? null;
  const firstTime = username === null;
  // Only follow an internal redirect target, so this can't be used to bounce
  // a reader to an arbitrary external URL.
  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

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
          {firstTime ? "welcome" : "account"}
        </p>
        <h1
          className="font-display text-[24px] leading-tight font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          {firstTime ? "Choose your username" : "Your username"}
        </h1>
        <p className="mt-1 mb-5 text-[13.5px]" style={{ color: "var(--muted)" }}>
          {firstTime
            ? "This is the name other readers see on your threads, comments, and votes. Your real name stays private. Pick one to start posting."
            : "This is how you appear publicly across discussions. You can change it anytime — the new name has to be available."}
        </p>

        <div
          className="rounded-[var(--radius)] p-4"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
          }}
        >
          <UsernameForm current={username} redirectTo={redirectTo} />
        </div>

        <Link
          href={redirectTo ?? "/library"}
          className="mt-8 inline-block text-[12.5px]"
          style={{ color: "var(--muted)" }}
        >
          ← {redirectTo ? "Back" : "Library"}
        </Link>
      </main>
    </div>
  );
}
