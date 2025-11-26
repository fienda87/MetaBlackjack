import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from './request-utils';
import { checkRateLimit } from './redis';

export async function middleware(request: NextRequest) {
  // Skip rate limiting for Socket.IO upgrade requests
  if (request.headers.get('upgrade')?.toLowerCase() === 'websocket' ||
      request.url.includes('/socket.io/')) {
    return NextResponse.next();
  }

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
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // 🚀 Phase 2: Tiered rate limiting
  // Anonymous: 100 req/min, Authenticated: 1000 req/min
  const clientIP = getClientIP(request);
  const authToken = request.headers.get('authorization') || request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!authToken;
  
  // Determine rate limit based on authentication
  const maxRequests = isAuthenticated ? 1000 : 100;
  const identifier = isAuthenticated ? `auth:${authToken}` : `ip:${clientIP}`;
  
  const rateLimitResult = await checkRateLimit(identifier, maxRequests, 60);
  
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
          'Retry-After': retryAfter.toString(),
        }
      }
    );
  }

  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());

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