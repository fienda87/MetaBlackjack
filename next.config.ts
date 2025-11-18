import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  webpack: (config) => {
    // Enable proper hot module replacement
    return config;
  },
  eslint: {
    // Enable ESLint checking during builds
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
