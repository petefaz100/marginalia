import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Art uploads post the image file through a Server Action; the default
    // 1MB cap is too small for photos, so allow up to 8MB.
    serverActions: {
      bodySizeLimit: "8mb",
    },
    // Don't let the client-side Router Cache reuse a previously-visited page
    // segment: data like vote counts and comments must be re-fetched whenever a
    // reader navigates back to a page, not restored from a stale snapshot.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
