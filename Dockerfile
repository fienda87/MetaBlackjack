# Stage 1: base
FROM node:18-alpine AS base
# RUN sed -i 's/https/http/g' /etc/apk/repositories && \
#    apk add --no-cache libc6-compat curl
WORKDIR /app

# Stage 2: deps (production dependencies)
FROM base AS deps
COPY package.json package-lock.json ./
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm ci --omit=dev --frozen-lockfile

# Stage 3: deps-dev (all dependencies for build)
FROM base AS deps-dev
COPY package.json package-lock.json ./
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm ci --frozen-lockfile

# Stage 4: builder
FROM deps-dev AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 5: runner (production)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
