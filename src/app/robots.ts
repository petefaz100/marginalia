import type { MetadataRoute } from "next";

const SITE = "https://www.marginaliaart.com";

// Tells crawlers they're welcome everywhere except the private, per-user areas
// (these need auth and hold nothing useful for search), and points them at the
// sitemap so they can discover every book page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/inbox", "/moderate"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
