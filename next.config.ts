import type { NextConfig } from "next";

import { RECEIPT_MAX_BYTES } from "./src/lib/constants";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Leave headroom above RECEIPT_MAX_BYTES for multipart form overhead.
      bodySizeLimit: `${Math.ceil(RECEIPT_MAX_BYTES / (1024 * 1024)) + 1}mb`,
    },
  },
};

export default nextConfig;
