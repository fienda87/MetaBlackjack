import { NextRequest, NextResponse } from 'next/server';
import { APIKeyManager, EncryptionService, AuditLogger } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limiter';

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting check
    const rateLimitResult = checkRateLimit(`api-key-${clientIP}`, 15 * 60 * 1000, 5);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many API key requests' },
        { status: 429 }
      );
    }

    const { userId, permissions, expiresIn } = await request.json();

    // Validate input
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = APIKeyManager.generateAPIKey(
      userId,
      permissions || ['read'],
      expiresIn || 86400000 // 24 hours default
    );

    // Log the action
    AuditLogger.log({
      userId,
      action: 'CREATE_API_KEY',
      resource: 'api-key',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      success: true,
      details: { permissions: permissions || ['read'], expiresIn }
    });

    return NextResponse.json({
      success: true,
      apiKey,
      expiresIn,
      permissions: permissions || ['read']
    });

  } catch (error) {
    console.error('API key generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { userId, apiKey } = await request.json();

    // Validate input
    if (!userId || !apiKey) {
      return NextResponse.json(
        { error: 'User ID and API key are required' },
        { status: 400 }
      );
    }

    // Validate API key before revoking
    if (!APIKeyManager.validateAPIKey(userId, apiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Revoke API key
    const revoked = APIKeyManager.revokeAPIKey(userId);

    if (revoked) {
      AuditLogger.log({
        userId,
        action: 'REVOKE_API_KEY',
        resource: 'api-key',
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        success: true
      });

      return NextResponse.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API key revocation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const apiKey = searchParams.get('apiKey');

    if (!userId || !apiKey) {
      return NextResponse.json(
        { error: 'User ID and API key are required' },
        { status: 400 }
      );
    }

    // Validate API key
    const isValid = APIKeyManager.validateAPIKey(userId, apiKey);

    AuditLogger.log({
      userId,
      action: 'VALIDATE_API_KEY',
      resource: 'api-key',
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      success: isValid
    });

    return NextResponse.json({
      valid: isValid,
      message: isValid ? 'API key is valid' : 'Invalid API key'
    });

  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate API key' },
      { status: 500 }
    );
  }
}