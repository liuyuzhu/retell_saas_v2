import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { ok, Err } from '@/lib/api-helpers';
import { ResetPasswordSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

    const { token, password } = parsed.data;
    const client = getSupabaseClient();

    const { data: resetToken, error } = await client
      .from('password_reset_tokens')
      .select('*, users(*)')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !resetToken) return Err.badRequest('Invalid or expired reset token.');
    if (new Date(resetToken.expires_at) < new Date()) return Err.badRequest('Reset token has expired.');

    const user = resetToken.users as { id: string; email: string; role: string };
    const passwordHash = await hashPassword(password);

    await Promise.all([
      client.from('users').update({ password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', user.id),
      client.from('password_reset_tokens').update({ used: true }).eq('id', resetToken.id),
    ]);

    const authToken = generateToken({ userId: user.id, email: user.email, role: user.role });
    await setAuthCookie(authToken);

    return ok({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return Err.internal();
  }
}
