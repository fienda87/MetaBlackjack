import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Internal API Authentication
 * Protects internal endpoints that should only be called by blockchain listeners
 */

// Generate a secure internal API key (store in .env in production)
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key-change-in-production';

// Optional: IP whitelist for additional security
const ALLOWED_IPS = process.env.INTERNAL_API_ALLOWED_IPS 
  ? process.env.INTERNAL_API_ALLOWED_IPS.split(',')
  : ['127.0.0.1', '::1', 'localhost'];

/**
 * Validate internal API request
 */
export function validateInternalRequest(request: NextRequest): { valid: boolean; error?: string } {
  // Check API key in header
  const apiKey = request.headers.get('x-internal-api-key');
  
  if (!apiKey) {
    return { valid: false, error: 'Missing internal API key' };
  }

  if (apiKey !== INTERNAL_API_KEY) {
    return { valid: false, error: 'Invalid internal API key' };
  }

  // Optional: Check IP whitelist in production
  if (process.env.NODE_ENV === 'production' && process.env.INTERNAL_API_IP_CHECK === 'true') {
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') ||
                     'unknown';
    
    const isAllowedIp = ALLOWED_IPS.some(ip => clientIp.includes(ip));
    
    if (!isAllowedIp) {
      return { valid: false, error: 'IP not whitelisted' };
    }
  }

  return { valid: true };
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message: error },
    { status: 401 }
  );
}

/**
 * Generate internal API key (for setup)
 */
export function generateInternalApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware wrapper for internal API routes
 */
export async function withInternalAuth(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const validation = validateInternalRequest(request);
  
  if (!validation.valid) {
    console.warn(`⚠️  Unauthorized internal API access attempt: ${validation.error}`);
    return unauthorizedResponse(validation.error!);
  }

  return handler(request);
}
