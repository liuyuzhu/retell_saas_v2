/**
 * auth-client.ts
 * Client-side auth utilities.
 *
 * ✅ Security fix: JWT tokens are NO LONGER stored in localStorage.
 * Authentication is handled exclusively via the httpOnly cookie set by the
 * server. The browser sends it automatically when `credentials: 'include'`
 * is used — no manual token injection required.
 *
 * We still cache non-sensitive user info (id, email, name, role) in
 * localStorage purely as a UI performance optimization (avoids a loading
 * flash on navigation). This data is NOT used for authorization decisions.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// ─── User info cache (display only, not used for auth) ────────────────────────

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('auth_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_user', JSON.stringify(user));
  localStorage.setItem('auth_timestamp', Date.now().toString());
}

/** Check whether the cached user info is still within the TTL (5 min). */
export function isAuthUserFresh(): boolean {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem('auth_timestamp');
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < 5 * 60 * 1000;
}

/** Clear all cached user data from localStorage. Does NOT clear the cookie — 
 *  call POST /api/auth/logout to invalidate the server-side cookie. */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_timestamp');
}

// ─── Authenticated fetch ──────────────────────────────────────────────────────

/**
 * Thin wrapper around `fetch` that ensures the auth cookie is always sent.
 * No Bearer token is injected — the httpOnly cookie is the sole auth mechanism.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // sends the httpOnly auth_token cookie automatically
  });
}
