// Renders a book cover, falling back to a titled gradient tile when no image
// is available. Used in the library grid, search results, and the book page.
export function CoverArt({
  url,
  title,
  radius = "var(--radius-sm)",
}: {
  url: string | null;
  title: string;
  radius?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Cover of ${title}`}
        className="h-full w-full object-cover"
        style={{ borderRadius: radius }}
      />
    );
  }
  return (
    <div
      className="grid h-full w-full place-items-center p-2 text-center font-display text-[13px] leading-tight"
      style={{
        borderRadius: radius,
        background:
          "linear-gradient(160deg, var(--obsidian-3), var(--obsidian-2))",
        color: "var(--muted)",
      }}
    >
      {title}
    </div>
  );
}
