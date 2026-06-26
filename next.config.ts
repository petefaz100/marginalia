import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Art uploads post the image file through a Server Action; the default
    // 1MB cap is too small for photos, so allow up to 8MB.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
