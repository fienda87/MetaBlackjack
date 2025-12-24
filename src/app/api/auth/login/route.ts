export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { SecureDB, EncryptionService, AuditLogger } from '@/lib/security';
import { createValidationMiddleware, ValidationSchemas } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP, getUserAgent } from '@/lib/request-utils';


// Rate limiting untuk login (lebih strict)
const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 menit
  maxAttempts: 5, // maksimal 5 attempt login
};

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting check
    const rateLimitResult = checkRateLimit(
      `login-${clientIP}`, 
      LOGIN_RATE_LIMIT.windowMs, 
      LOGIN_RATE_LIMIT.maxAttempts
    );

    if (!rateLimitResult.allowed) {
      // Log failed attempt due to rate limiting
      AuditLogger.log({
        action: 'LOGIN_RATE_LIMITED',
        resource: 'auth',
        ip: clientIP,
        userAgent,
        success: false,
        details: { 
          reason: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }
      });

      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Validate input
    const validation = await createValidationMiddleware(ValidationSchemas.login)(request);
    
    if (validation instanceof NextResponse) {
      // Validation failed
      AuditLogger.log({
        action: 'LOGIN_VALIDATION_FAILED',
        resource: 'auth',
        ip: clientIP,
        userAgent,
        success: false,
        details: { reason: 'Invalid input format' }
      });
      
      return validation;
    }

    const { sanitizedData } = validation;
    const { email, password } = sanitizedData;

    // Validate user credentials
    try {
      const user = await SecureDB.validateUserCredentials(email, password);

      // Generate JWT token
      const token = EncryptionService.generateSecureToken(64);
      
      // Log successful login
      AuditLogger.log({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        ip: clientIP,
        userAgent,
        success: true,
        details: { email: user.email }
      });

      // Set secure HTTP-only cookie
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          walletAddress: user.walletAddress,
          balance: user.balance
        }
      });

      // Set secure cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/',
      });

      // Set rate limit headers
      response.headers.set('X-RateLimit-Limit', LOGIN_RATE_LIMIT.maxAttempts.toString());
      response.headers.set('X-RateLimit-Remaining', (LOGIN_RATE_LIMIT.maxAttempts - 1).toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

      return response;

    } catch (error: any) {
      // Log failed login attempt
      AuditLogger.log({
        action: 'LOGIN_FAILED',
        resource: 'auth',
        ip: clientIP,
        userAgent,
        success: false,
        details: { 
          email,
          reason: error.message || 'Invalid credentials'
        }
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Login error:', error);
    
    const clientIP = getClientIP(request);
    
    AuditLogger.log({
      action: 'LOGIN_ERROR',
      resource: 'auth',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      success: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if user is authenticated
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // For this example, we'll just return a simple response
  // In production, you'd validate the JWT token
  return NextResponse.json({
    authenticated: true,
    message: 'User is authenticated'
  });
}

export async function DELETE(request: NextRequest) {
  // Logout functionality
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Log logout
  AuditLogger.log({
    action: 'LOGOUT',
    resource: 'auth',
    ip: clientIP,
    userAgent,
    success: true
  });

  // Clear auth cookie
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
