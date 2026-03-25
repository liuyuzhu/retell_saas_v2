import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { ok, err, Err } from '@/lib/api-helpers';
import { LoginSchema } from '@/lib/validation';
import { authRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // ── Rate limiting (5 attempts / 15 min per IP) ────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = authRateLimit(ip);
  if (!rl.success) {
    return err('Too many login attempts. Please try again later.', 429);
  }

  try {
    let body: unknown;
    try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

    const { email, password } = parsed.data;
    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Uniform error message to prevent user enumeration
    if (error || !user) return err('Invalid email or password.', 401);

    if (!user.is_active) {
      return err('Account is deactivated. Please contact the administrator.', 403);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return err('Invalid email or password.', 401);

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    await setAuthCookie(token);

    // ✅ Security fix: do NOT return the token in the response body.
    // Authentication is handled entirely via the httpOnly cookie set above.
    // The client must use `credentials: 'include'` for all subsequent requests.
    const { password_hash: _, ...userWithoutPassword } = user;
    return ok({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('[Login] Error:', error);
    return Err.internal();
  }
}
