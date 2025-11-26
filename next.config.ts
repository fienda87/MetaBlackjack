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
  
  webpack: (config, { isServer }) => {
    // Fix MetaMask SDK async-storage issue for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };
    
    // Client-side bundle optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Split vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split Redux Toolkit & React-Redux
            redux: {
              test: /[\\/]node_modules[\\/](@reduxjs|react-redux|reselect)[\\/]/,
              name: 'redux',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Split Socket.IO client
            socket: {
              test: /[\\/]node_modules[\\/](socket\.io-client)[\\/]/,
              name: 'socket',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Split Wagmi & Viem (Web3 libraries)
            web3: {
              test: /[\\/]node_modules[\\/](wagmi|viem|@tanstack)[\\/]/,
              name: 'web3',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Split UI components (shadcn/radix)
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'ui',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Common chunks
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
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
