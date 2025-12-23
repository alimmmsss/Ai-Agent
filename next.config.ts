import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Allow local images from public folder
    unoptimized: false,
  },
};

export default nextConfig;
