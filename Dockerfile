# syntax=docker/dockerfile:1.4

# ============================================================================
# STAGE 1: Base Image
# ============================================================================
FROM node:20-alpine AS base

LABEL maintainer="MetaBlackjack Team"
LABEL description="MetaBlackjack - Web3 Casino Platform"

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# ============================================================================
# STAGE 2: Production Dependencies
# ============================================================================
FROM base AS deps

# Copy only package files (package-lock.json is required)
COPY package.json package-lock.json ./

# Install production dependencies ONLY (no dev dependencies)
# Use --legacy-peer-deps to handle peer dependency conflicts with fallback
RUN npm ci --omit=dev --frozen-lockfile --legacy-peer-deps || \
    npm ci --omit=dev --frozen-lockfile

# ============================================================================
# STAGE 3: Development Dependencies (for build)
# ============================================================================
FROM base AS deps-all

# Copy only package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev)
# Use --legacy-peer-deps to handle peer dependency conflicts with fallback
RUN npm ci --frozen-lockfile --legacy-peer-deps || \
    npm ci --frozen-lockfile

# ============================================================================
# STAGE 4: Builder (compile & build Next.js)
# ============================================================================
FROM deps-all AS builder

WORKDIR /app

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set fallback DATABASE_URL for build time only
ENV DATABASE_URL='postgresql://build:build@localhost/build'

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# ============================================================================
# STAGE 5: Production Runtime
# ============================================================================
FROM base AS runner
LABEL stage="production"

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Create necessary directories
RUN mkdir -p /app/public /app/.next/cache /app/logs

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install curl for health checks
RUN apk add --no-cache curl

# Copy production dependencies from deps stage (includes tsx)
COPY --from=deps /app/node_modules ./node_modules

# Copy server.ts and TypeScript config
COPY --chown=nextjs:nodejs server.ts ./
COPY --chown=nextjs:nodejs tsconfig.json ./

# Copy source code needed by server.ts (socket, redis, blockchain listeners)
COPY --chown=nextjs:nodejs src ./src
COPY --chown=nextjs:nodejs blockchain ./blockchain

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health endpoint metadata
LABEL health="http://localhost:3000/health"
LABEL readiness="http://localhost:3000/ready"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "server.ts"]
