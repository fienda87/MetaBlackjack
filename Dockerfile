# syntax=docker/dockerfile:1.4

# Base stage with Node.js 18 Alpine
FROM node:18-alpine AS base
LABEL maintainer="MetaBlackjack Team"
LABEL description="MetaBlackjack - Web3 Casino Platform"

# Install system dependencies required for compilation
RUN apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Production dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./

# Use npm ci for reproducible builds
RUN npm ci --only=production --frozen-lockfile

# Development dependencies stage (for build)
FROM deps AS deps-dev
RUN npm ci --frozen-lockfile

# Builder stage - compile TypeScript and build Next.js
FROM deps-dev AS builder
WORKDIR /app

# Copy application code
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Optimize Prisma client generation
RUN npx prisma generate --no-engine

# Build the application
RUN npm run build

# Production runtime stage - minimal image
FROM base AS runner
LABEL stage="production"

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Create necessary directories
RUN mkdir -p /app/public /app/.next/cache /app/logs

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma client and schema
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Health check script
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health endpoint metadata
LABEL health="http://localhost:3000/health"
LABEL readiness="http://localhost:3000/ready"

# Start the application
CMD ["node", "server.js"]