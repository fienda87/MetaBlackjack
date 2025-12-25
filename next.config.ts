import type { NextConfig } from 'next'

const config: NextConfig = {
  // ✅ Enable compression
  compress: true,

  // ✅ Standalone output for Docker deployments
  output: 'standalone',

  // ✅ Disable source maps in production (saves ~500ms build time)
  productionBrowserSourceMaps: false,

  // ✅ Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images
    minimumCacheTTL: 60000,
  },

  // ✅ TypeScript configuration
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },

  // ✅ ESLint configuration
  eslint: {
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
    ignoreDuringBuilds: false,
  },

  // ✅ React strict mode (development only)
  reactStrictMode: true,

  // ✅ PoweredByHeader disabled (security)
  poweredByHeader: false,

  // ✅ Generate ETags for caching
  generateEtags: true,

  // ✅ Trailing slash configuration
  trailingSlash: false,

  // ✅ Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ✅ Experimental optimizations (Next.js 14+)
  experimental: {
    // Uncomment when Turbopack is stable (Next.js 15+)
    // turbopack: true,

    // Optimize specific package imports
    optimizePackageImports: [
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'framer-motion',
      'sonner',
      'recharts',
      'socket.io-client',
      'viem',
      'wagmi',
    ],

    // Optimize CSS loading
    optimizeCss: true,

    // Skip static optimization for Railway deployment
    // Allows dynamic routes to render at runtime with DATABASE_URL available
    // This is the stable Next.js 15.5.9+ alternative to deprecated dynamicIO
    skipStaticOptimization: true,
  },

  // ✅ Webpack customization for aggressive splitting
  webpack: (config, { isServer, dev }) => {
    // Optimize split chunks for better caching
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single', // Single runtime chunk for all chunks
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25, // Allow more chunks (better caching)
          maxAsyncRequests: 25,
          minSize: 20000,
          maxSize: 250000, // Force split if larger
          cacheGroups: {
            // ========== VENDOR CHUNKS ==========

            // React & React-DOM (always separate)
            react: {
              test: /[\/]node_modules[\/](react|react-dom|react-is)[\/]/,
              name: 'react-vendor',
              priority: 50,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Redux ecosystem
            redux: {
              test: /[\/]node_modules[\/](@reduxjs|redux|react-redux|reselect)[\/]/,
              name: 'redux-vendor',
              priority: 45,
              reuseExistingChunk: true,
              enforce: true,
            },

            // @tanstack React Query
            tanstack: {
              test: /[\/]node_modules[\/](@tanstack|react-query)[\/]/,
              name: 'tanstack-vendor',
              priority: 44,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Web3 libraries (large, separate)
            web3: {
              test: /[\/]node_modules[\/](wagmi|viem|@wagmi|ethers)[\/]/,
              name: 'web3-vendor',
              priority: 43,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Socket.IO
            socket: {
              test: /[\/]node_modules[\/](socket\.io-client)[\/]/,
              name: 'socket-vendor',
              priority: 42,
              reuseExistingChunk: true,
              enforce: true,
            },

            // UI Components (Radix-UI)
            radixui: {
              test: /[\/]node_modules[\/](@radix-ui)[\/]/,
              name: 'radixui-vendor',
              priority: 41,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Framer Motion & animations
            animations: {
              test: /[\/]node_modules[\/](framer-motion|tailwindcss-animate)[\/]/,
              name: 'animations-vendor',
              priority: 40,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Forms (React Hook Form + Zod)
            forms: {
              test: /[\/]node_modules[\/](react-hook-form|zod|uuid)[\/]/,
              name: 'forms-vendor',
              priority: 39,
              reuseExistingChunk: true,
              enforce: true,
            },

            // Utils & helpers
            utils: {
              test: /[\/]node_modules[\/](lucide-react|date-fns|crypto-js|axios|jose)[\/]/,
              name: 'utils-vendor',
              priority: 38,
              reuseExistingChunk: true,
              enforce: true,
            },

            // All other node_modules
            vendor: {
              test: /[\/]node_modules[\/]/,
              name: 'vendor',
              priority: 10,
              reuseExistingChunk: true,
            },

            // ========== COMMON CHUNKS ==========

            // Code used in multiple places
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: 'common',
            },
          },
        },
      }
    }

    // Fix MetaMask SDK async-storage issue for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    }

    // Enable proper hot module replacement
    return config
  },

  // ✅ Headers for caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // ✅ Redirects configuration
  async redirects() {
    return []
  },

  // ✅ Rewrites configuration
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    }
  },

  // ✅ Environment variables
  env: {
    NEXT_PUBLIC_BUILD_TIME: process.env.BUILD_TIME || new Date().toISOString(),
  },
}

export default config
