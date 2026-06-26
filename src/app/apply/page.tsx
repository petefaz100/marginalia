import Link from "next/link";
import { SiteHeader } from "../_components/site-header";
import { ApplyForm } from "./apply-form";

export const metadata = {
  title: "Apply to be a mod — marginalia",
  description:
    "Help curate spoiler-safe art for your favorite books. Tell the mods a little about yourself.",
};

export default function ApplyPage() {
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
          <ApplyForm />
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
