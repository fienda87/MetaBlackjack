import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  
  // Optimize CSS loading to prevent preload warnings
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    optimizePackageImports: ['@/components/ui'], // Optimize UI component imports
  },
  
  webpack: (config) => {
    // Fix MetaMask SDK async-storage issue for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };
    
    // Enable proper hot module replacement
    return config;
  },
  
  eslint: {
    // Enable ESLint checking during builds
    ignoreDuringBuilds: false,
  },
  
  // Optimize performance
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
};

export default nextConfig;
