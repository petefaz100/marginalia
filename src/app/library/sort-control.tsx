"use client";

import { useRouter } from "next/navigation";

type Sort = "az" | "recent" | "indie";

const OPTIONS: [Sort, string][] = [
  ["az", "A–Z"],
  ["recent", "Recently added"],
  ["indie", "Indie books"],
];

// Builds the /library href that preserves the search query and swaps in the
// chosen sort (omitting sort=az since that's the default).
function hrefFor(sort: Sort, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sort !== "az") params.set("sort", sort);
  return params.toString() ? `/library?${params}` : "/library";
}

// The library sort control. On phones the three choices would crowd the row, so
// they collapse into a single native dropdown; on md+ screens we show the pills.
export function SortControl({ sort, query }: { sort: Sort; query: string }) {
  const router = useRouter();

  return (
    <>
      {/* Mobile: one compact dropdown. */}
      <select
        value={sort}
        onChange={(e) => router.push(hrefFor(e.target.value as Sort, query), { scroll: false })}
        aria-label="Sort the library"
        className="h-9 rounded-full px-3 text-[12.5px] font-semibold outline-none md:hidden"
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--obsidian-3)",
          color: "var(--silver-bright)",
        }}
      >
        {OPTIONS.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      {/* Desktop: the full pill row. */}
      <div className="hidden gap-1.5 md:flex">
        {OPTIONS.map(([key, label]) => {
          const active = sort === key;
          return (
            <a
              key={key}
              href={hrefFor(key, query)}
              onClick={(e) => {
                e.preventDefault();
                router.push(hrefFor(key, query), { scroll: false });
              }}
              className="h-7 rounded-full px-2.5 text-[11.5px] font-semibold leading-7"
              style={
                active
                  ? { background: "var(--ember)", color: "#fff" }
                  : {
                      border: "1px solid var(--line)",
                      background: "var(--obsidian-2)",
                      color: "var(--silver)",
                    }
              }
            >
              {label}
            </a>
          );
        })}
      </div>
    </>
  );
}
