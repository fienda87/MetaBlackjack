/**
 * Zod Validation Schemas
 * Centralized validation schemas for high-traffic API routes
 */

import { z } from 'zod';

/**
 * Game Action Schema
 */
export const GameActionSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  action: z.enum([
    'hit',
    'stand',
    'double_down',
    'insurance',
    'split',
    'surrender',
    'split_hit',
    'split_stand',
    'set_ace_value'
  ]),
  userId: z.string().min(1, 'User ID is required'),
  payload: z.any().optional()
});

export type GameActionInput = z.infer<typeof GameActionSchema>;

/**
 * Store Purchase Schema
 */
export const StorePurchaseSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().positive().default(1),
  currency: z.enum(['GBC', 'USD']).default('GBC')
});

export type StorePurchaseInput = z.infer<typeof StorePurchaseSchema>;

/**
 * User Update Schema
 */
export const UserUpdateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
  settings: z.object({
    soundEnabled: z.boolean().optional(),
    musicEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional()
  }).optional()
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

/**
 * Game Create Schema
 */
export const GameCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  betAmount: z.number().positive('Bet amount must be positive').max(10000, 'Bet amount too high'),
  sessionId: z.string().optional()
});

export type GameCreateInput = z.infer<typeof GameCreateSchema>;

/**
 * Deposit Initiate Schema
 */
export const DepositInitiateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount too high'),
  currency: z.enum(['GBC', 'ETH', 'USDC']).default('GBC')
});

export type DepositInitiateInput = z.infer<typeof DepositInitiateSchema>;

/**
 * Withdrawal Initiate Schema
 */
export const WithdrawalInitiateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().positive('Amount must be positive'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address')
});

export type WithdrawalInitiateInput = z.infer<typeof WithdrawalInitiateSchema>;

/**
 * History Query Schema
 */
export const HistoryQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  resultFilter: z.enum(['all', 'WIN', 'LOSE', 'PUSH', 'BLACKJACK']).default('all')
});

export type HistoryQueryInput = z.infer<typeof HistoryQuerySchema>;

/**
 * Pagination Schema
 */
export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  cursor: z.string().optional()
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Helper function to validate request body with Zod
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed: Unknown error']
    };
  }
}

/**
 * Helper function to validate query parameters with Zod
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: URLSearchParams
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    // Convert URLSearchParams to object
    const data: any = {};
    params.forEach((value, key) => {
      // Try to parse numbers
      if (!isNaN(Number(value)) && value !== '') {
        data[key] = Number(value);
      } else if (value === 'true' || value === 'false') {
        data[key] = value === 'true';
      } else {
        data[key] = value;
      }
    });

    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed: Unknown error']
    };
  }
}
