import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAuth, ok, Err } from '@/lib/api-helpers';

export const GET = withAuth(async (_req, ctx) => {
  const client = getSupabaseClient();

  const { data: user, error } = await client
    .from('users')
    .select('id, email, name, role, phone, is_active, created_at, updated_at')
    .eq('id', ctx.user.userId)
    .single();

  if (error || !user) return Err.notFound('User not found.');

  return ok({ success: true, user });
});
