type ConnState =
  | { state: "unset" }
  | { state: "connected" }
  | { state: "error"; message: string };

// Proves the Supabase project URL + key are valid by pinging the auth health
// endpoint, which returns 200 only with a valid key (401 without one). No
// tables or RLS required — just confirms the wiring is live.
async function checkSupabase(): Promise<ConnState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { state: "unset" };
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!res.ok) return { state: "error", message: `HTTP ${res.status}` };
    return { state: "connected" };
  } catch (e) {
    return {
      state: "error",
      message: e instanceof Error ? e.message : "unreachable",
    };
  }
}

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

function StatusChip({ conn }: { conn: ConnState }) {
  const map = {
    connected: { color: "var(--ok)", label: "Supabase connected" },
    unset: { color: "var(--muted)", label: "Add your Supabase keys" },
    error: { color: "var(--wine-soft)", label: "Supabase error" },
  } as const;
  const { color, label } = map[conn.state];
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold"
      style={{
        border: "1px solid var(--line)",
        background: "var(--obsidian-2)",
        color: "var(--silver)",
      }}
    >
      <span
        className="h-[7px] w-[7px] rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
      {conn.state === "error" ? (
        <span style={{ color: "var(--muted-2)" }}>· {conn.message}</span>
      ) : null}
    </div>
  );
}

export default async function Home() {
  const conn = await checkSupabase();

  return (
    <div
      className="relative mx-auto min-h-screen"
      style={{
        maxWidth: "var(--maxw)",
        padding: "0 18px calc(40px + env(safe-area-inset-bottom))",
      }}
    >
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3"
        style={{
          padding: "16px 0 12px",
          background:
            "linear-gradient(180deg, var(--obsidian) 62%, rgba(19,17,25,0))",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
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
        </div>
      </header>

      <main style={{ padding: "14px 2px 6px" }}>
        <p
          className="text-[11.5px] tracking-[.16em] uppercase"
          style={{ color: "var(--ember-soft)", marginBottom: 13 }}
        >
          a reading companion
        </p>

        <h1
          className="font-display font-medium"
          style={{
            fontSize: 36,
            lineHeight: 1.02,
            letterSpacing: ".3px",
            color: "var(--silver-bright)",
            marginBottom: 13,
          }}
        >
          Gather around a book and share art{" "}
          <em className="italic" style={{ color: "var(--flame-2)" }}>
            chapter by chapter
          </em>
          .
        </h1>

        <p
          className="text-[15px]"
          style={{
            color: "var(--muted)",
            maxWidth: "40ch",
            lineHeight: 1.55,
            marginBottom: 26,
          }}
        >
          Everything past where you are in the book stays hidden until you mark
          your chapter read. Spoiler-safe fan art, gated to exactly where you
          are.
        </p>

        <StatusChip conn={conn} />

        <div
          className="mt-7 rounded-[var(--radius)]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--obsidian-2)",
            padding: "22px 20px",
          }}
        >
          <p
            className="font-mono text-[11px] tracking-wide uppercase"
            style={{ color: "var(--ember-soft)", marginBottom: 8 }}
          >
            step 1 of 7 · live
          </p>
          <p
            className="text-[14px]"
            style={{ color: "var(--silver)", lineHeight: 1.55 }}
          >
            The scaffold is up and the design system is wired. Books, the
            chapter spoiler gate, and the fan-art loop come next.
          </p>
        </div>
      </main>
    </div>
  );
}
