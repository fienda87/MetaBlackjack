import rateLimit from 'express-rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiter untuk API endpoints umum
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // maksimal 100 request per 15 menit
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter untuk authentication endpoints (lebih strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // maksimal 5 attempt login per 15 menit
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rate limiter untuk game endpoints
export const gameLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 30, // maksimal 30 game actions per menit
  message: {
    error: 'Too many game actions, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter untuk sensitive operations (purchase, dll)
export const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  max: 3, // maksimal 3 sensitive operations per 5 menit
  message: {
    error: 'Too many sensitive operations, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Custom rate limiter untuk Next.js API routes
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  const limiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      error: options.message || 'Rate limit exceeded',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return async (req: NextRequest) => {
    const response = await new Promise((resolve) => {
      limiter(req as any, {
        status: (code: number) => resolve(NextResponse.json(
          { error: 'Rate limit exceeded' }, 
          { status: code }
        )),
        json: (data: any) => resolve(NextResponse.json(data)),
        setHeader: () => {},
      } as any, () => resolve(NextResponse.next()));
    });

    return response as any;
  };
}

// Store untuk tracking rate limits per IP
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Reset atau buat record baru
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime
  };
}

// Cleanup expired entries setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);