// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/**",
      },
      {
        protocol: "http",
        hostname: "image.tmdb.org",
        pathname: "/t/**",
      },
    ],
  },
};

export default nextConfig;
