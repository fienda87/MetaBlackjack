import { db } from './db';
import { NextRequest } from 'next/server';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

// Log security events
export async function logSecurityEvent(
  action: string,
  request: NextRequest,
  details: any = {}
) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.auditLog.create({
      data: {
        action,
        resource: 'security',
        ipAddress,
        userAgent,
        newValues: details
      }
    });

    // Also log to console for immediate monitoring
    console.log(`🔒 Security Event: ${action}`, {
      ipAddress,
      userAgent,
      ...details
    });

  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Log user actions
export async function logUserAction(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any,
  request?: NextRequest
) {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';

    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
        ipAddress,
        userAgent
      }
    });

  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

// Log game events
export async function logGameEvent(
  userId: string,
  gameId: string,
  action: string,
  details: any = {},
  request?: NextRequest
) {
  await logUserAction(
    userId,
    action,
    'game',
    gameId,
    undefined,
    details,
    request
  );
}

// Log financial events
export async function logFinancialEvent(
  userId: string,
  transactionId: string,
  action: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  request?: NextRequest
) {
  await logUserAction(
    userId,
    action,
    'transaction',
    transactionId,
    { balanceBefore },
    { balanceAfter, amount },
    request
  );
}

// Get audit logs for user
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await db.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset
  });
}

// Get security events
export async function getSecurityEvents(
  limit: number = 100,
  offset: number = 0
) {
  return await db.auditLog.findMany({
    where: { resource: 'security' },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset
  });
}

// Detect suspicious activities
export async function detectSuspiciousActivity(userId: string) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const recentLogs = await db.auditLog.findMany({
    where: {
      userId,
      timestamp: { gte: oneHourAgo }
    }
  });

  const suspiciousPatterns = {
    tooManyLogins: recentLogs.filter(log => log.action === 'login_attempt').length > 10,
    tooManyGames: recentLogs.filter(log => log.action === 'game_start').length > 100,
    rapidTransactions: recentLogs.filter(log => log.resource === 'transaction').length > 20,
    multipleIPs: new Set(recentLogs.map(log => log.ipAddress)).size > 3
  };

  const isSuspicious = Object.values(suspiciousPatterns).some(Boolean);

  if (isSuspicious) {
    await logSecurityEvent('suspicious_activity_detected', null as any, {
      userId,
      patterns: suspiciousPatterns,
      logCount: recentLogs.length
    });
  }

  return {
    isSuspicious,
    patterns: suspiciousPatterns
  };
}

// Middleware to log all API requests
export function auditMiddleware(action: string, resource: string) {
  return async (request: NextRequest, userId?: string, resourceId?: string) => {
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Log asynchronously to not block the request
      setTimeout(async () => {
        try {
          await db.auditLog.create({
            data: {
              userId,
              action,
              resource,
              resourceId,
              ipAddress,
              userAgent
            }
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
        }
      }, 0);

    } catch (error) {
      console.error('Audit middleware error:', error);
    }
  };
}