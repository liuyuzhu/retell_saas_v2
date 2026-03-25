import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

// ─── i18n middleware ──────────────────────────────────────────────────────────

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// ─── Admin route pre-check ────────────────────────────────────────────────────

/**
 * Light-weight cookie presence check for /api/admin/* routes.
 *
 * This is a defence-in-depth layer only — it does NOT verify the JWT.
 * Full authorization (role checks, token verification) still happens inside
 * each route handler via withAdmin / withPrimary.
 *
 * Why bother? It short-circuits requests from unauthenticated clients before
 * they ever reach a handler, and it catches routes that accidentally missed a
 * withAuth wrapper.
 */
function guardAdminRoute(request: NextRequest): NextResponse | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  return null; // continue to handler
}

// ─── Combined middleware ──────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard admin API routes
  if (pathname.startsWith('/api/admin')) {
    const guard = guardAdminRoute(request);
    if (guard) return guard;
  }

  // i18n routing for non-API paths
  if (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/_vercel')) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
