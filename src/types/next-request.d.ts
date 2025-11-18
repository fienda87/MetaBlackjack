import { AuthenticatedUser } from '@/lib/auth-middleware';
import { NextRequest } from 'next/server';

declare module 'next/server' {
  interface NextRequest {
    user?: AuthenticatedUser;
  }
}

export {};