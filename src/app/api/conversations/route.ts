import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAuth, ok, Err } from '@/lib/api-helpers';

// GET /api/conversations - List conversations (with data isolation)
// Note: Since Retell AI doesn't have a list-conversations API, we use the user_calls table
// which is populated via webhooks.

export const GET = withAuth(async (request: NextRequest, ctx) => {
  const p = request.nextUrl.searchParams;
  const limit = parseInt(p.get('limit') ?? '50');
  const before = p.get('before') ? parseInt(p.get('before')!) : undefined;
  const after = p.get('after') ? parseInt(p.get('after')!) : undefined;

  const client = getSupabaseClient();

  try {
    let query = client
      .from('user_calls')
      .select('*', { count: 'exact' })
      .order('start_timestamp', { ascending: false })
      .limit(limit);

    // Data isolation: tenants only see their own calls
    if (!ctx.isAdmin) {
      query = query.eq('user_id', ctx.user.userId);
    }

    // Only show ended calls in conversations (ongoing calls shouldn't appear here)
    query = query.eq('call_status', 'ended');

    if (before) query = query.lt('start_timestamp', before);
    if (after) query = query.gt('start_timestamp', after);

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error('[Conversations] DB error:', error);
      // 如果表不存在，返回空列表而不是错误
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        return ok({ data: [], has_more: false, count: 0 });
      }
      return Err.internal();
    }

    return ok({ data: conversations ?? [], has_more: false, count: count ?? 0 });
  } catch (err) {
    console.error('[Conversations] Unexpected error:', err);
    return ok({ data: [], has_more: false, count: 0 });
  }
});
