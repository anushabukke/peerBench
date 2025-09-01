import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["hyparquet", "@supabase/supabase-js"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    serverActions: {
      bodySizeLimit: "1000mb",
    },
  },
  reactStrictMode: false,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
