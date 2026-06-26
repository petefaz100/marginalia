import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE = "https://www.marginaliaart.com";

// Lists every public URL so search engines index the whole catalog, not just
// the pages they happen to stumble onto. Static marketing/entry routes are
// hard-coded; every book page is pulled from the database so newly added books
// show up automatically. RLS keeps this to books visible to the public.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/library`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE}/apply`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let bookRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: books } = await supabase
      .from("books")
      .select("id, created_at")
      .order("created_at", { ascending: false });
    bookRoutes = (books ?? []).map((b) => ({
      url: `${SITE}/books/${b.id}`,
      lastModified: b.created_at ? new Date(b.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // If the catalog can't be reached at build/request time, still emit the
    // static routes rather than failing the whole sitemap.
    bookRoutes = [];
  }

  return [...staticRoutes, ...bookRoutes];
}
