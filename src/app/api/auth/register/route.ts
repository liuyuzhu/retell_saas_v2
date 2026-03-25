import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateToken, setAuthCookie, isPrimaryAccount } from '@/lib/auth';
import { sendWelcomeEmail, isEmailConfigured } from '@/lib/email';
import { ok, err, Err } from '@/lib/api-helpers';
import { RegisterSchema } from '@/lib/validation';
import { authRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // ── Rate limiting (5 attempts / 15 min per IP) ────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = authRateLimit(ip);
  if (!rl.success) {
    return err('Too many registration attempts. Please try again later.', 429);
  }

  try {
    let body: unknown;
    try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

    const { email, password, name, phone } = parsed.data;

    if (isPrimaryAccount(email)) return Err.forbidden('This email is reserved.');

    const client = getSupabaseClient();

    const { data: existing } = await client
      .from('users').select('id').eq('email', email).limit(1).single();

    if (existing) return Err.badRequest('Email already registered.');

    const passwordHash = await hashPassword(password);

    const { data: newUser, error } = await client
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name: name ?? email.split('@')[0],
        phone: phone ?? null,
        role: 'user',
        is_active: true,
      })
      .select()
      .single();

    if (error || !newUser) {
      console.error('[Register] Create error:', error);
      return Err.internal();
    }

    const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
    await setAuthCookie(token);

    // Send welcome email (best-effort, non-blocking on failure)
    if (isEmailConfigured()) {
      const locale = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ?? 'zh';
      await sendWelcomeEmail(newUser.email, newUser.name ?? '用户', locale).catch(e =>
        console.error('[Register] Welcome email failed:', e)
      );
    }

    // ✅ Security fix: do NOT return the token in the response body.
    // Authentication is handled entirely via the httpOnly cookie set above.
    const { password_hash: _, ...userWithoutPassword } = newUser;
    return ok({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('[Register] Error:', error);
    return Err.internal();
  }
}
