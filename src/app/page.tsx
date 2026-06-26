import Link from "next/link";
import { SiteHeader } from "./_components/site-header";

export const metadata = {
  title: "marginalia — fan art without spoilers",
  description:
    "Explore chapter-safe art, character visuals, discussions, and recaps that unlock only as far as you've read.",
};

// Two CTAs reused across the page: a warm primary "apply to be a mod" and a
// quieter "browse books". Both take an href so the same component serves the
// hero, mid-page, and footer placements.
function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold transition-transform hover:-translate-y-0.5"
      style={{
        background: "var(--ember)",
        color: "#fff",
        boxShadow: "0 14px 30px -12px rgba(224,104,63,.7)",
      }}
    >
      {children}
    </Link>
  );
}

function SecondaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold transition-colors"
      style={{
        border: "1px solid var(--line-2)",
        background: "rgba(27,25,37,.6)",
        color: "var(--silver-bright)",
      }}
    >
      {children}
    </Link>
  );
}

function CtaPair({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <PrimaryCta href="#curate">apply to be a mod</PrimaryCta>
      <SecondaryCta href="/library">browse books</SecondaryCta>
    </div>
  );
}

// Soft-bordered dark panel used for every feature/problem/step card.
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] p-5 ${className}`}
      style={{
        border: "1px solid var(--line)",
        background: "rgba(27,25,37,.55)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.02)",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11.5px] tracking-[.18em] uppercase"
      style={{ color: "var(--ember-soft)" }}
    >
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display text-[26px] leading-tight font-medium sm:text-[30px]"
      style={{ color: "var(--silver-bright)" }}
    >
      {children}
    </h2>
  );
}

// A tiny abstract stand-in for fan art — no real copyrighted imagery, just a
// blurred fantasy-toned panel with a soft glow.
function ArtPlaceholder({
  locked,
  hue,
}: {
  locked?: boolean;
  hue: string;
}) {
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-[10px]"
      style={{
        border: "1px solid var(--line-2)",
        background: locked
          ? "repeating-linear-gradient(135deg, var(--obsidian-3) 0 8px, var(--obsidian-2) 8px 16px)"
          : `radial-gradient(120% 100% at 30% 20%, ${hue} 0%, var(--obsidian-3) 70%)`,
      }}
    >
      {locked ? (
        <span
          className="absolute inset-0 grid place-items-center"
          style={{ color: "var(--muted)" }}
        >
          <LockIcon />
        </span>
      ) : null}
    </div>
  );
}

export default function Home() {
  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] sm:max-w-[680px] lg:max-w-[1040px]"
      style={{ padding: "0 18px calc(56px + env(safe-area-inset-bottom))" }}
    >
      <SiteHeader />

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="grid items-center gap-10 pt-6 pb-4 lg:grid-cols-2 lg:gap-12 lg:pt-12">
          <div>
            <Eyebrow>a spoiler-safe reading companion</Eyebrow>
            <h1
              className="mt-4 font-display text-[40px] leading-[1.05] font-medium sm:text-[52px]"
              style={{ color: "var(--silver-bright)" }}
            >
              fan art{" "}
              <span style={{ color: "var(--ember)" }}>without</span> spoilers.
            </h1>
            <p
              className="mt-5 max-w-[480px] text-[15.5px] leading-relaxed"
              style={{ color: "var(--silver)" }}
            >
              Explore chapter-safe art, character visuals, discussions, and
              recaps that unlock only as far as you&apos;ve read.
            </p>
            <CtaPair className="mt-7" />
            <p
              className="mt-6 text-[12.5px]"
              style={{ color: "var(--muted)" }}
            >
              Chapter-locked. Spoiler-aware. Built for readers who hate
              accidental spoilers.
            </p>
          </div>

          {/* Preview card: one book, a couple unlocked pieces, the rest locked */}
          <div
            className="rounded-[var(--radius)] p-4"
            style={{
              border: "1px solid var(--line)",
              background: "rgba(27,25,37,.7)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="font-display text-[16px] font-medium"
                  style={{ color: "var(--silver-bright)" }}
                >
                  The Shattered Sea
                </p>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  You&apos;ve read through chapter 6
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase"
                style={{
                  background: "rgba(154,127,208,.16)",
                  color: "var(--violet-soft)",
                  border: "1px solid rgba(154,127,208,.3)",
                }}
              >
                spoiler-safe
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <ArtPlaceholder hue="rgba(224,104,63,.55)" />
              <ArtPlaceholder hue="rgba(154,127,208,.5)" />
              <ArtPlaceholder hue="rgba(111,143,201,.5)" />
              <ArtPlaceholder locked hue="" />
              <ArtPlaceholder locked hue="" />
              <ArtPlaceholder locked hue="" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px]">
              <span style={{ color: "var(--ember-soft)" }}>
                Ch. 1–6 · unlocked
              </span>
              <span style={{ color: "var(--muted)" }}>Ch. 7+ · locked</span>
            </div>
          </div>
        </section>

        {/* ---------------- Problem ---------------- */}
        <section className="pt-20">
          <Eyebrow>the problem</Eyebrow>
          <SectionTitle>
            Googling a character shouldn&apos;t ruin the book.
          </SectionTitle>
          <p
            className="mt-4 max-w-[620px] text-[15px] leading-relaxed"
            style={{ color: "var(--silver)" }}
          >
            You just wanted to know what a character looked like. Then Google,
            Pinterest, Reddit, and fan art all betrayed you — three books ahead,
            in a single thumbnail.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <ProblemIcon kind="search" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Spoiler-filled search results
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                One image search and the villain&apos;s big twist is sitting
                right there in the previews.
              </p>
            </Card>
            <Card>
              <ProblemIcon kind="art" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Fan art from future chapters
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Gorgeous art — of a scene you&apos;re two hundred pages away
                from reading.
              </p>
            </Card>
            <Card>
              <ProblemIcon kind="chat" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Discussions that assume you finished
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Every thread is a minefield of &ldquo;wait until you find out
                who—.&rdquo;
              </p>
            </Card>
          </div>
        </section>

        {/* ---------------- Solution ---------------- */}
        <section className="pt-20">
          <Eyebrow>the fix</Eyebrow>
          <SectionTitle>marginalia keeps pace with your reading.</SectionTitle>
          <p
            className="mt-4 max-w-[620px] text-[15px] leading-relaxed"
            style={{ color: "var(--silver)" }}
          >
            Set your current chapter and everything stays behind a gate until
            you get there. Nothing ahead leaks — by design, enforced on the
            server.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <FeatureIcon kind="lock" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Chapter-locked visuals
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Art and character designs reveal themselves chapter by chapter,
                exactly as far as you&apos;ve read — never a page sooner.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="shield" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Safe discussions
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Talk about what you&apos;ve read with people at the same point
                in the story. No future-chapter ambushes.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="people" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Reader-led curation
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Volunteer mods tag every piece to the right chapter, so the
                spoiler gate stays accurate and the library keeps growing.
              </p>
            </Card>
          </div>
        </section>

        {/* ---------------- Mod / curator ---------------- */}
        <section id="curate" className="scroll-mt-24 pt-20">
          <Eyebrow>become a curator</Eyebrow>
          <SectionTitle>Help curate your favorite book.</SectionTitle>
          <p
            className="mt-4 max-w-[620px] text-[15px] leading-relaxed"
            style={{ color: "var(--silver)" }}
          >
            Know a series inside out? Become a mod and build the spoiler-safe
            space you wish existed — chapter by chapter, for everyone reading
            after you.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <FeatureIcon kind="layers" />
              <p
                className="mt-3 text-[14.5px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Create chapter spaces
              </p>
              <p
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Set up a home for each chapter where art and notes can live.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="tag" />
              <p
                className="mt-3 text-[14.5px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Tag art and visuals
              </p>
              <p
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Place each piece at the right chapter so the gate stays honest.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="shield" />
              <p
                className="mt-3 text-[14.5px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Guide spoiler-safe discussions
              </p>
              <p
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Keep conversations welcoming and free of future-chapter leaks.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="growth" />
              <p
                className="mt-3 text-[14.5px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Help grow the library
              </p>
              <p
                className="mt-1.5 text-[13px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Add the books you love and bring new readers in safely.
              </p>
            </Card>
          </div>

          <CtaPair className="mt-8" />
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how" className="scroll-mt-24 pt-20">
          <Eyebrow>how it works</Eyebrow>
          <SectionTitle>Read, unlock, discuss.</SectionTitle>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Choose your book",
                d: "Find your current read in the library — or add it in a couple of taps.",
              },
              {
                n: "2",
                t: "Set your current chapter",
                d: "Tell marginalia how far you've read. That sets your spoiler line.",
              },
              {
                n: "3",
                t: "Explore safely",
                d: "Browse art, notes, recaps, and discussions — all locked to where you are.",
              },
            ].map((step) => (
              <Card key={step.n}>
                <span
                  className="font-mono grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold"
                  style={{
                    background: "rgba(154,127,208,.16)",
                    color: "var(--violet-soft)",
                    border: "1px solid rgba(154,127,208,.3)",
                  }}
                >
                  {step.n}
                </span>
                <p
                  className="mt-3 text-[15px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {step.t}
                </p>
                <p
                  className="mt-1.5 text-[13.5px] leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {step.d}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------------- Final CTA ---------------- */}
        <section className="pt-20">
          <div
            className="rounded-[var(--radius)] px-6 py-12 text-center"
            style={{
              border: "1px solid var(--line)",
              background:
                "radial-gradient(120% 130% at 50% 0%, rgba(154,127,208,.12) 0%, rgba(27,25,37,.7) 60%)",
              boxShadow: "var(--shadow)",
            }}
          >
            <SectionTitle>Stay in the margins, not the spoilers.</SectionTitle>
            <p
              className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed"
              style={{ color: "var(--silver)" }}
            >
              Pick a book, set your chapter, and let the art catch up to you —
              never the other way around.
            </p>
            <CtaPair className="mt-7 justify-center" />
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------------- icons ---------------- */

function LockIcon() {
  return (
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
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconFrame({
  children,
  tone = "ember",
}: {
  children: React.ReactNode;
  tone?: "ember" | "violet" | "flame";
}) {
  const map = {
    ember: { bg: "rgba(224,104,63,.14)", fg: "var(--ember-soft)", bd: "rgba(224,104,63,.3)" },
    violet: { bg: "rgba(154,127,208,.16)", fg: "var(--violet-soft)", bd: "rgba(154,127,208,.3)" },
    flame: { bg: "rgba(111,143,201,.16)", fg: "var(--flame-2)", bd: "rgba(111,143,201,.3)" },
  }[tone];
  return (
    <span
      className="grid h-10 w-10 place-items-center rounded-[12px]"
      style={{ background: map.bg, color: map.fg, border: `1px solid ${map.bd}` }}
    >
      {children}
    </span>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ProblemIcon({ kind }: { kind: "search" | "art" | "chat" }) {
  return (
    <IconFrame tone="ember">
      {kind === "search" ? (
        <Svg>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      ) : kind === "art" ? (
        <Svg>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </Svg>
      ) : (
        <Svg>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      )}
    </IconFrame>
  );
}

function FeatureIcon({
  kind,
}: {
  kind: "lock" | "shield" | "people" | "layers" | "tag" | "growth";
}) {
  const tone =
    kind === "lock" || kind === "layers"
      ? "violet"
      : kind === "people" || kind === "growth"
        ? "flame"
        : "ember";
  return (
    <IconFrame tone={tone}>
      {kind === "lock" ? (
        <Svg>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Svg>
      ) : kind === "shield" ? (
        <Svg>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      ) : kind === "people" ? (
        <Svg>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        </Svg>
      ) : kind === "layers" ? (
        <Svg>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </Svg>
      ) : kind === "tag" ? (
        <Svg>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </Svg>
      ) : (
        <Svg>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </Svg>
      )}
    </IconFrame>
  );
}
