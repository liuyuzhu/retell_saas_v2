/**
 * api-helpers.ts
 * Shared utilities for API route handlers:
 * - Auth guard wrappers (withAuth, withAdmin, withPrimary)
 * - Typed JSON response helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getCurrentUserFromHeader, isPrimaryAccount, JWTPayload } from '@/lib/auth';

// ─── Response helpers ────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export const Err = {
  unauthorized: () => err('Unauthorized.', 401),
  forbidden: (msg = 'Access denied.') => err(msg, 403),
  notFound: (msg = 'Not found.') => err(msg, 404),
  badRequest: (msg: string) => err(msg, 400),
  internal: () => err('Internal server error.', 500),
};

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface AuthContext {
  user: JWTPayload;
  isAdmin: boolean;
  isPrimary: boolean;
}

type AuthHandler = (
  request: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

// ─── withAuth ────────────────────────────────────────────────────────────────

/**
 * Wraps a route handler and injects the authenticated user context.
 * Supports both Cookie and Authorization header (Bearer token).
 * Returns 401 if not logged in.
 */
export function withAuth(handler: AuthHandler) {
  return async (request: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    try {
      // Try to get user from Cookie first, then from Authorization header
      let user = await getCurrentUser();
      
      // If no user from cookie, try Authorization header
      if (!user) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          user = getCurrentUserFromHeader(token);
        }
      }
      
      if (!user) return Err.unauthorized();

      const params = routeCtx?.params ? await routeCtx.params : undefined;

      const ctx: AuthContext = {
        user,
        isAdmin: user.role === 'admin',
        isPrimary: isPrimaryAccount(user.email),
      };

      return await handler(request, ctx, params);
    } catch (error) {
      console.error('[withAuth] Unhandled error:', error);
      return Err.internal();
    }
  };
}

// ─── withAdmin ───────────────────────────────────────────────────────────────

/**
 * Like withAuth but additionally requires role === 'admin'.
 * Returns 403 for authenticated non-admin users.
 */
export function withAdmin(handler: AuthHandler) {
  return withAuth(async (request, ctx, params) => {
    if (!ctx.isAdmin) {
      return Err.forbidden('Admin access required.');
    }
    return handler(request, ctx, params);
  });
}

// ─── withPrimary ─────────────────────────────────────────────────────────────

/**
 * Like withAuth but requires the request to come from the primary account.
 * Returns 403 for everyone else, including regular admins.
 */
export function withPrimary(handler: AuthHandler) {
  return withAuth(async (request, ctx, params) => {
    if (!ctx.isPrimary) {
      return Err.forbidden('Only the primary account owner can perform this action.');
    }
    return handler(request, ctx, params);
  });
}

// ─── parseBody ───────────────────────────────────────────────────────────────

/**
 * Safely parses the JSON request body.
 * Returns null if the body is missing or malformed.
 */
export async function parseBody<T = Record<string, unknown>>(
  request: NextRequest
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
