import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Redis is configured
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Mock rate limiter for development without Redis
const mockRateLimiter = {
  limit: async (_identifier: string) => ({
    success: true,
    limit: 1000,
    remaining: 999,
    reset: Date.now() + 60000,
    pending: Promise.resolve()
  })
};

// Create a new ratelimiter that allows 10 requests per 10 seconds
const ratelimit = hasRedisConfig ? new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
}) : mockRateLimiter;

// Different rate limits for different endpoints
export const rateLimits = {
  // Strict rate limit for authentication endpoints
  auth: hasRedisConfig ? new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
    analytics: true,
  }) : mockRateLimiter,
  
  // Medium rate limit for game actions
  game: hasRedisConfig ? new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 requests per minute
    analytics: true,
  }) : mockRateLimiter,
  
  // Lenient rate limit for general API
  general: hasRedisConfig ? new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter: Ratelimit.slidingWindow(100, "60 s"), // 100 requests per minute
    analytics: true,
  }) : mockRateLimiter,
};

export { ratelimit };

// Rate limiting middleware function
export async function rateLimitMiddleware(
  request: Request,
  type: 'auth' | 'game' | 'general' = 'general'
) {
  const ip = request.headers.get("x-forwarded-for") ?? 
             request.headers.get("x-real-ip") ?? 
             "127.0.0.1";
  
  const { success, limit, remaining, reset } = await rateLimits[type].limit(ip);
  
  return {
    success,
    limit,
    remaining,
    reset,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    }
  };
}