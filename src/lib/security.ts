import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

// Environment variables untuk secret keys
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key'
);

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token utilities
export async function createJWT(payload: any, expiresIn: string = '24h'): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate API key
export function generateApiKey(): string {
  const prefix = 'bkj_'; // Blackjack prefix
  const token = crypto.randomBytes(24).toString('hex');
  return `${prefix}${token}`;
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate Bitcoin address format (basic)
export function isValidBitcoinAddress(address: string): boolean {
  // Basic validation for Bitcoin addresses
  const bitcoinRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
  return bitcoinRegex.test(address);
}

// Encrypt sensitive data
export function encrypt(text: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt sensitive data
export function decrypt(encryptedData: string, key: string): string {
  const algorithm = 'aes-256-gcm';
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Rate limiting untuk password attempts
const passwordAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkPasswordAttempts(identifier: string): boolean {
  const now = Date.now();
  const attempts = passwordAttempts.get(identifier);
  
  if (!attempts) {
    passwordAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset jika sudah lewat 15 menit
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    passwordAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Block jika sudah 5 attempts dalam 15 menit
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

// Clear password attempts
export function clearPasswordAttempts(identifier: string): void {
  passwordAttempts.delete(identifier);
}

// Simple in-memory API key manager for admin endpoints (persist in DB for production)
const apiKeyStore = new Map<string, { userId: string; permissions: string[]; expiresAt: number }>()

export const APIKeyManager = {
  generateAPIKey(userId: string, permissions: string[] = ['read'], ttlMs: number = 24 * 60 * 60 * 1000) {
    const key = generateApiKey()
    const expiresAt = Date.now() + ttlMs
    apiKeyStore.set(key, { userId, permissions, expiresAt })
    return key
  },
  validateAPIKey(userId: string, key: string) {
    const record = apiKeyStore.get(key)
    if (!record) return false
    if (record.userId !== userId) return false
    if (Date.now() > record.expiresAt) {
      apiKeyStore.delete(key)
      return false
    }
    return true
  },
  revokeAPIKey(key: string) {
    return apiKeyStore.delete(key)
  }
}

// Simple audit logger
export const AuditLogger = {
  log(entry: any) {
    // For now, just console.log — in production write to a persistent store
    try {
      console.log('[AUDIT]', JSON.stringify(entry))
    } catch (err) {
      console.error('[AUDIT ERROR]', err)
      console.log('[AUDIT]', entry)
    }
  }
}

// Lightweight encryption service wrapper
export const EncryptionService = {
  generateSecureToken: (length = 32) => generateSecureToken(length),
  encrypt: (text: string, key: string) => encrypt(text, key),
  decrypt: (text: string, key: string) => decrypt(text, key)
}

// SecureDB helpers that use the Prisma client (db) where appropriate
import { db } from './db'

export const SecureDB = {
  async validateUserCredentials(email: string, password: string) {
    // Try to find user by email
    const user = await db.user.findUnique({ where: { email } })
    if (!user) throw new Error('User not found')
    // Use verifyPassword exported above
    const ok = await verifyPassword(password, user.passwordHash || '')
    if (!ok) throw new Error('Invalid credentials')
    return user
  }
}