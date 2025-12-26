import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from './request-utils';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS handling
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://metablackjack-production.up.railway.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Rate limiting check
  const clientIP = getClientIP(request);
  // Rate limiting temporarily disabled
  const rateLimitResult = { allowed: true, remaining: 100, resetTime: Date.now() + 60000 };
  
  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

  // Request size validation
  const contentLength = request.headers.get('content-length');
  const maxRequestSize = parseInt(process.env.MAX_REQUEST_SIZE || '10485760'); // 10MB
  
  if (contentLength && parseInt(contentLength) > maxRequestSize) {
    return new NextResponse(
      JSON.stringify({ error: 'Request too large' }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Log request for audit
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - IP: ${clientIP}`);

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};