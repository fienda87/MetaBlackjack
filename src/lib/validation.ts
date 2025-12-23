import { NextRequest } from 'next/server';
import { sanitizeInput } from './security';

// Validation schemas
export const validationSchemas = {
  // Login schema (email + password)
  login: {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Format email tidak valid'
    },
    password: {
      required: true,
      minLength: 6,
      message: 'Password harus minimal 6 karakter'
    }
  },
  // User registration
  register: {
    username: {
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Username harus 3-20 karakter, hanya alphanumeric dan underscore'
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Format email tidak valid'
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Password minimal 8 karakter dengan huruf besar, kecil, angka, dan simbol'
    }
  },
  
  // Game actions
  gameBet: {
    amount: {
      required: true,
      min: 0.00000001, // 1 satoshi
      max: 10, // Max 10 BTC
      type: 'number',
      message: 'Amount harus antara 0.00000001 dan 10 BTC'
    },
    currency: {
      required: true,
      enum: ['BTC', 'ETH', 'USDT', 'USDC'],
      message: 'Currency harus BTC, ETH, USDT, atau USDC'
    }
  },
  
  // Store purchase
  purchase: {
    itemId: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 50,
      message: 'Item ID harus diisi'
    },
    quantity: {
      required: true,
      type: 'number',
      min: 1,
      max: 100,
      message: 'Quantity harus antara 1 dan 100'
    }
  }
};

// Export alias expected by routes
export const ValidationSchemas = validationSchemas;

// Create a middleware wrapper used by routes. Returns either NextResponse (on failure) or an object with sanitizedData
import { NextResponse } from 'next/server'

export function createValidationMiddleware(schema: any) {
  return async function(request: NextRequest | any) {
    try {
      const body = await request.json();
      const validation = validateInput(body, schema);

      if (!validation.isValid) {
        return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
      }

      return { sanitizedData: body, isValid: true };
    } catch (err) {
      console.error('createValidationMiddleware error', err)
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }
  };
}

// Validation function
export function validateInput(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const rule = rules as any;
    
    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Type validation
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be of type ${rule.type}`);
      continue;
    }
    
    // String validation
    if (typeof value === 'string') {
      // Sanitize input
      data[field] = sanitizeInput(value);
      
      // Min length
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      
      // Max length
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      
      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || `${field} format is invalid`);
      }
    }
    
    // Number validation
    if (typeof value === 'number') {
      // Min value
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      
      // Max value
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be at most ${rule.max}`);
      }
    }
    
    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate request body
export function validateRequestBody(request: NextRequest, schemaName: keyof typeof validationSchemas) {
  return async function() {
    try {
      const body = await request.json();
      const schema = validationSchemas[schemaName];
      const validation = validateInput(body, schema);
      
      return {
        isValid: validation.isValid,
        errors: validation.errors,
        data: body
      };
    } catch (err) {
      console.error('validateRequestBody error', err)
      return {
        isValid: false,
        errors: ['Invalid JSON format'],
        data: null
      };
    }
  };
}

// SQL Injection prevention
export function sanitizeSqlInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential SQL injection patterns
    return input
      .replace(/['"\\;]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeSqlInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeSqlInput(value);
    }
    return sanitized;
  }
  
  return input;
}

// Export alias for backward compatibility
export const validateAction = sanitizeSqlInput;

// Validate file upload
export function validateFileUpload(file: File, maxSize: number = 5 * 1024 * 1024) { // 5MB default
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  const errors: string[] = [];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not allowed. Only JPEG, PNG, GIF, and WebP are supported');
  }
  
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}