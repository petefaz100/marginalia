import Link from "next/link";
import { SiteHeader } from "./_components/site-header";
import { signInWithGoogle } from "./auth/actions";

export const metadata = {
  title: "marginalia — a community home for book art, without spoilers",
  description:
    "A community-built home for the art and conversation around the books you love — by indie artists and authors, revealed only as far as you've read.",
};

// FAQ content lives in one place: rendered visibly below and emitted as
// FAQPage structured data so search engines and AI answer-engines can quote it.
const FAQS: { q: string; a: string }[] = [
  {
    q: "What is marginalia?",
    a: "Marginalia are the notes, sketches, and scribbles readers leave in a book's margins — and that's the spirit here. marginalia is a community-driven home for the art and discussion that grows up around the books you love, kept in step with how far you've read, so nothing ahead is spoiled.",
  },
  {
    q: "Is it free?",
    a: "Yes. Browsing books, viewing art, and joining discussions are all free.",
  },
  {
    q: "What does “spoiler-safe” actually mean?",
    a: "You set the chapter you've read to. Any art or discussion from later chapters stays locked until you reach it — and the gate is enforced on the server, not just hidden in the page.",
  },
  {
    q: "I'm an independent artist — can I share my work here?",
    a: "Absolutely. marginalia is built to give indie artists a place to show their work, credited and tied to the right chapter. Apply to be a mod to start adding art.",
  },
  {
    q: "I'm an author — can I gather my book's art in one place?",
    a: "Yes. Independent authors can bring all the art for their book together in a single spoiler-safe home for their readers.",
  },
  {
    q: "I'm an artist or author and I don't want my book or art featured here.",
    a: "Just let us know and we'll take it down promptly — email peterfazon@gmail.com.",
  },
];

// Two CTAs reused across the page: a warm primary "Browse Books" and a quieter
// "Apply to be a Mod". Both take an href so the same component serves the hero
// and footer placements.
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

const secondaryCtaClass =
  "inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold transition-colors";
const secondaryCtaStyle = {
  border: "1px solid var(--line-2)",
  background: "rgba(27,25,37,.6)",
  color: "var(--silver-bright)",
} as const;

// "Sign up" kicks off Google sign-in. It's a server action, so it must post
// from a <form> rather than navigate via a <Link>; styled to match the
// secondary CTA so the pair reads as one set of buttons.
function SignUpCta() {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value="/account" />
      <button type="submit" className={secondaryCtaClass} style={secondaryCtaStyle}>
        Sign up
      </button>
    </form>
  );
}

function CtaPair({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <PrimaryCta href="/library">Browse Books</PrimaryCta>
      <SignUpCta />
    </div>
  );
}

// Soft-bordered dark panel used for every feature/step card.
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

// A tiny abstract stand-in for a piece of art — no real imagery, just a blurred
// fantasy-toned panel with a soft glow.
function ArtPlaceholder({ locked, hue }: { locked?: boolean; hue: string }) {
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

// A real piece of art in the preview grid (vs. the abstract placeholders).
function ArtImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-[10px]"
      style={{ border: "1px solid var(--line-2)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

export default function Home() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div
      className="relative mx-auto min-h-screen w-full max-w-[540px] sm:max-w-[680px] lg:max-w-[1040px]"
      style={{ padding: "0 18px calc(56px + env(safe-area-inset-bottom))" }}
    >
      {/* FAQ structured data for Google / AI answer engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <SiteHeader />

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="grid items-center gap-10 pt-6 pb-4 lg:grid-cols-2 lg:gap-12 lg:pt-12">
          <div>
            <Eyebrow>a community-driven reading companion</Eyebrow>
            <h1
              className="mt-4 font-display text-[40px] leading-[1.05] font-medium sm:text-[52px]"
              style={{ color: "var(--silver-bright)" }}
            >
              Book art,{" "}
              <span style={{ color: "var(--ember)" }}>without</span> spoilers.
            </h1>
            <p
              className="mt-5 max-w-[480px] text-[15.5px] leading-relaxed"
              style={{ color: "var(--silver)" }}
            >
              A home built by readers for the art and conversation around the
              books you love — championing independent artists and authors, and
              revealed only as far as you&apos;ve read.
            </p>
            <CtaPair className="mt-7" />
          </div>

          {/* Preview card: one book, a couple unlocked pieces, the rest locked.
              The whole card links to that book's page on the site. */}
          <Link
            href="/books/30611c20-80bd-433d-9669-5c2669df360d"
            className="block rounded-[var(--radius)] p-4 transition-transform hover:-translate-y-0.5"
            style={{
              border: "1px solid var(--line)",
              background: "rgba(27,25,37,.7)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="truncate font-display text-[16px] font-medium"
                  style={{ color: "var(--silver-bright)" }}
                >
                  A Court of Thorns and Roses
                </p>
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  by Sarah J. Maas
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide uppercase"
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
              <ArtImage src="/preview/acotar-1.jpg" alt="Character portrait" />
              <ArtImage src="/preview/acotar-2.jpg" alt="Character portrait" />
              <ArtImage src="/preview/acotar-3.jpg" alt="Character portrait" />
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
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
              Featured character art by{" "}
              <span style={{ color: "var(--ember-soft)" }}>@madschofield</span>
            </p>
          </Link>
        </section>

        {/* ---------------- How the gate works ---------------- */}
        <section className="pt-20">
          <Eyebrow>how it stays spoiler-safe</Eyebrow>
          <SectionTitle>The art keeps pace with your reading.</SectionTitle>
          <p
            className="mt-4 max-w-[620px] text-[15px] leading-relaxed"
            style={{ color: "var(--silver)" }}
          >
            Set your current chapter and everything stays behind a gate until you
            reach it. Nothing ahead leaks — by design, enforced on the server.
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
                Talk with people at the same point in the story. No
                future-chapter ambushes.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="people" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                Curated by readers
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Volunteer mods tie every piece to the right chapter, so the gate
                stays accurate and the library keeps growing.
              </p>
            </Card>
          </div>
        </section>

        {/* ---------------- Community showcase ---------------- */}
        <section className="pt-20">
          <Eyebrow>built by the community</Eyebrow>
          <SectionTitle>A platform for the people who love books.</SectionTitle>
          <p
            className="mt-4 max-w-[620px] text-[15px] leading-relaxed"
            style={{ color: "var(--silver)" }}
          >
            marginalia exists to showcase independent artists and authors — and
            to give every reader a spoiler-safe way to enjoy their work.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <FeatureIcon kind="palette" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                For artists
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                A platform to show your work — credited, tied to the right
                chapter, and found by readers who are looking for exactly it.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="book" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                For authors
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Gather all the art for your book in one place — a spoiler-safe
                home indie authors can send their readers to.
              </p>
            </Card>
            <Card>
              <FeatureIcon kind="eye" />
              <p
                className="mt-3 text-[15px] font-semibold"
                style={{ color: "var(--silver-bright)" }}
              >
                For readers
              </p>
              <p
                className="mt-1.5 text-[13.5px] leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Discover art and join discussions about your current read,
                without a single page of what&apos;s coming next.
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
            space you wish existed — adding books, placing art at the right
            chapter, and keeping discussions welcoming.
          </p>
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
                d: "Browse art and discussions — all locked to where you are.",
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

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="scroll-mt-24 pt-20">
          <Eyebrow>questions</Eyebrow>
          <SectionTitle>Frequently asked.</SectionTitle>

          <div className="mt-8 flex flex-col gap-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-[var(--radius)] p-5"
                style={{
                  border: "1px solid var(--line)",
                  background: "rgba(27,25,37,.55)",
                }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold"
                  style={{ color: "var(--silver-bright)" }}
                >
                  {f.q}
                  <span
                    className="transition-transform group-open:rotate-45"
                    style={{ color: "var(--ember-soft)" }}
                    aria-hidden
                  >
                    <PlusIcon />
                  </span>
                </summary>
                <p
                  className="mt-3 text-[14px] leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {f.q.startsWith("I'm an artist or author and I don't") ? (
                    <>
                      Just let us know and we&apos;ll take it down promptly —
                      email{" "}
                      <a
                        href="mailto:peterfazon@gmail.com"
                        className="underline"
                        style={{ color: "var(--ember-soft)" }}
                      >
                        peterfazon@gmail.com
                      </a>
                      .
                    </>
                  ) : (
                    f.a
                  )}
                </p>
              </details>
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
            <SectionTitle>Help build the margins.</SectionTitle>
            <p
              className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed"
              style={{ color: "var(--silver)" }}
            >
              Artist, author, or reader — marginalia is built by its community.
              Submit an application to become a mod, add spoiler-safe art, and
              help shape the home for the books you love.
            </p>
            <div className="mt-7 flex justify-center">
              <PrimaryCta href="/apply">Apply to be a Mod</PrimaryCta>
            </div>
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

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function FeatureIcon({
  kind,
}: {
  kind: "lock" | "shield" | "people" | "palette" | "book" | "eye";
}) {
  const tone =
    kind === "lock"
      ? "violet"
      : kind === "people" || kind === "book"
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
      ) : kind === "palette" ? (
        <Svg>
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.012 17.5 2 12 2z" />
        </Svg>
      ) : kind === "book" ? (
        <Svg>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </Svg>
      ) : (
        <Svg>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </Svg>
      )}
    </IconFrame>
  );
}
