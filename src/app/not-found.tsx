import Link from "next/link";
import { SiteHeader } from "./_components/site-header";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div
      className="relative mx-auto min-h-screen"
      style={{
        maxWidth: "var(--maxw)",
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <SiteHeader />

      <main
        style={{ padding: "8px 2px 6px" }}
        className="flex flex-col items-center pt-16 text-center"
      >
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 12 }}
        >
          lost the thread
        </p>
        <h1
          className="font-display text-[26px] leading-tight font-medium"
          style={{ color: "var(--silver-bright)" }}
        >
          This page is past the spoiler line.
        </h1>
        <p
          className="mt-2 max-w-[360px] text-[13.5px]"
          style={{ color: "var(--muted)" }}
        >
          We couldn&apos;t find what you were looking for — it may have moved, or
          never existed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full px-5 py-2.5 text-[13px] font-semibold"
          style={{ background: "var(--ember)", color: "#fff" }}
        >
          Back to the library
        </Link>
      </main>
    </div>
  );
}
