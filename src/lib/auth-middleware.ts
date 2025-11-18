import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, checkPasswordAttempts, clearPasswordAttempts } from './security';
import { db } from './db';

export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  balance: number;
  isActive: boolean;
  emailVerified: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  requiresTwoFactor?: boolean;
}

// Authentication middleware for API routes
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return {
        success: false,
        error: 'Authorization header required'
      };
    }

    // Handle Bearer token (JWT)
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = await verifyJWT(token);
        const user = await db.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            walletAddress: true,
            username: true,
            email: true,
            balance: true,
            isActive: true,
            emailVerified: true,
            lockedUntil: true,
            twoFactorSecret: true
          }
        });

        if (!user) {
          return {
            success: false,
            error: 'User not found'
          };
        }

        // Check if user is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return {
            success: false,
            error: 'Account is temporarily locked'
          };
        }

        // Check if user is active
        if (!user.isActive) {
          return {
            success: false,
            error: 'Account is deactivated'
          };
        }

        // Check if 2FA is required
        if (user.twoFactorSecret && !decoded.twoFactorVerified) {
          return {
            success: false,
            error: 'Two-factor authentication required',
            requiresTwoFactor: true
          };
        }

        return {
          success: true,
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            username: user.username || undefined,
            email: user.email || undefined,
            balance: user.balance,
            isActive: user.isActive,
            emailVerified: user.emailVerified
          }
        };
      } catch (error) {
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }
    }

    // Handle API Key authentication
    if (authHeader.startsWith('ApiKey ')) {
      const apiKey = authHeader.substring(7);
      
      const user = await db.user.findFirst({
        where: { apiKey },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          email: true,
          balance: true,
          isActive: true,
          emailVerified: true,
          lockedUntil: true
        }
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      }

      // Similar checks as JWT
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username || undefined,
          email: user.email || undefined,
          balance: user.balance,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        }
      };
    }

    return {
      success: false,
      error: 'Invalid authorization format'
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

// Login authentication with rate limiting
export async function authenticateLogin(
  identifier: string, // email or username
  password: string,
  ipAddress: string
): Promise<AuthResult> {
  try {
    // Check password attempts
    if (!checkPasswordAttempts(identifier + ':' + ipAddress)) {
      return {
        success: false,
        error: 'Too many failed attempts. Please try again later.'
      };
    }

    // Find user by email or username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        passwordHash: true,
        balance: true,
        isActive: true,
        emailVerified: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        twoFactorSecret: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return {
        success: false,
        error: 'Account is temporarily locked'
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated'
      };
    }

    // Check if email is verified
    if (!user.emailVerified && user.email) {
      return {
        success: false,
        error: 'Please verify your email first'
      };
    }

    // Verify password if user has password login
    if (user.passwordHash) {
      const { verifyPassword } = await import('./security');
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        // Increment failed attempts
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: user.failedLoginAttempts + 1,
            // Lock account after 5 failed attempts for 30 minutes
            lockedUntil: user.failedLoginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null
          }
        });
        
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
    }

    // Clear failed attempts on successful login
    await clearPasswordAttempts(identifier + ':' + ipAddress);
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    return {
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username || undefined,
        email: user.email || undefined,
        balance: user.balance,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      },
      requiresTwoFactor: !!user.twoFactorSecret
    };

  } catch (error) {
    console.error('Login authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

// Middleware wrapper for API routes
export function withAuth(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    const auth = await authenticateRequest(request);
    
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    // Add user to request context
    request.user = auth.user;
    
    return handler(request, ...args);
  };
}

// Role-based access control
export function hasRole(user: AuthenticatedUser, requiredRole: string): boolean {
  // For now, all authenticated users have 'user' role
  // You can extend this with role management
  return true;
}

// Check if user can access resource
export function canAccessResource(
  user: AuthenticatedUser,
  resourceType: string,
  resourceId: string
): boolean {
  // Simple ownership check - user can only access their own resources
  switch (resourceType) {
    case 'game':
    case 'session':
    case 'transaction':
    case 'wallet':
      // In a real implementation, you'd check if the resource belongs to the user
      return true;
    default:
      return false;
  }
}