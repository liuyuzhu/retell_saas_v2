/**
 * rate-limit.ts
 *
 * Simple sliding-window rate limiter backed by an in-process Map.
 * Suitable for single-instance deployments (Vercel serverless, single Node).
 *
 * ⚠️  For multi-instance / edge deployments, replace the store with Redis:
 *     https://github.com/upstash/ratelimit
 *     `npm install @upstash/ratelimit @upstash/redis`
 *     and swap RateLimiter for Ratelimit.slidingWindow(...) from that package.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Periodically clean up expired windows to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now >= win.resetAt) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // Unix ms
}

/**
 * Check whether `key` is within the allowed rate.
 *
 * @param key       Unique identifier — e.g. `login:${ip}` or `forgot:${email}`
 * @param limit     Max requests in the window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || now >= win.resetAt) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count += 1;

  return {
    success: win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}

// ─── Preset helpers ───────────────────────────────────────────────────────────

/** 5 attempts per 15 minutes — login / register */
export function authRateLimit(ip: string): RateLimitResult {
  return rateLimit(`auth:${ip}`, 5, 15 * 60 * 1000);
}

/** 3 attempts per 60 minutes — password reset (per email) */
export function forgotPasswordRateLimit(email: string): RateLimitResult {
  return rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000);
}
