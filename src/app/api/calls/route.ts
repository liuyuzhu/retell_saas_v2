import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, ok, Err } from '@/lib/api-helpers';
import { CreateCallSchema } from '@/lib/validation';
import type { CreateWebCallRequest, CreatePhoneCallRequest } from '@/lib/retell-types';

// ─── GET /api/calls ───────────────────────────────────────────────────────────
// Admin: all calls. Tenant: own calls only.

export const GET = withAuth(async (request: NextRequest, ctx) => {
  const p = request.nextUrl.searchParams;
  // Clamp limit: min 1, max 200 — prevents unbounded DB queries
  const limit = Math.min(Math.max(parseInt(p.get('limit') ?? '50') || 50, 1), 200);
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

    if (before) query = query.lt('start_timestamp', before);
    if (after) query = query.gt('start_timestamp', after);

    const { data: calls, error, count } = await query;

    if (error) {
      console.error('[Calls] DB error:', error);
      // 如果表不存在，返回空列表而不是错误
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        return ok({ data: [], has_more: false, count: 0 });
      }
      return Err.internal();
    }

    return ok({ data: calls ?? [], has_more: false, count: count ?? 0 });
  } catch (err) {
    console.error('[Calls] Unexpected error:', err);
    return ok({ data: [], has_more: false, count: 0 });
  }
});

// ─── POST /api/calls ──────────────────────────────────────────────────────────

export const POST = withAuth(async (request: NextRequest, ctx) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const parsed = CreateCallSchema.safeParse(body);
  if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { agent_id, call_type, from_number, to_number, language, metadata, retell_llm_dynamic_variables } = parsed.data;

  const client = getSupabaseClient();

  // Tenant access control: verify agent and phone number ownership
  if (!ctx.isAdmin) {
    const { data: agentAccess } = await client
      .from('user_agents')
      .select('id')
      .eq('user_id', ctx.user.userId)
      .eq('agent_id', agent_id)
      .single();

    if (!agentAccess) return Err.forbidden('Access denied to this agent.');

    if (from_number || to_number) {
      const numberToCheck = from_number || to_number;
      const { data: phoneAccess } = await client
        .from('user_phone_numbers')
        .select('id')
        .eq('user_id', ctx.user.userId)
        .eq('phone_number', numberToCheck!)
        .single();

      if (!phoneAccess) return Err.forbidden('Access denied to this phone number.');
    }
  }

  const retell = getRetellClient();
  const isWebCall = call_type === 'web_call' || (!from_number && !to_number);

  let result: unknown;

  if (isWebCall) {
    const webCallData: CreateWebCallRequest = {
      agent_id,
      metadata: { ...metadata, language: language ?? 'en', user_id: ctx.user.userId },
      retell_llm_dynamic_variables: retell_llm_dynamic_variables
        ? { ...retell_llm_dynamic_variables, user_language: language, language_code: language }
        : undefined,
    };
    result = await retell.createWebCall(webCallData);
  } else {
    const phoneCallData: CreatePhoneCallRequest = {
      from_number: from_number!,
      to_number: to_number!,
      agent_id,
      metadata: { ...metadata, user_id: ctx.user.userId },
      retell_llm_dynamic_variables,
    };
    result = await retell.createPhoneCall(phoneCallData);
  }

  // Persist call record for data isolation (best-effort)
  try {
    const callResult = result as { call_id?: string };
    if (callResult.call_id) {
      await client.from('user_calls').insert({
        user_id: ctx.user.userId,
        call_id: callResult.call_id,
        call_type: isWebCall ? 'web_call' : 'phone_call',
        agent_id,
        from_number: from_number ?? null,
        to_number: to_number ?? null,
        call_status: 'ongoing',
        start_timestamp: Date.now(),
        metadata: { language, created_by: ctx.user.email },
      });
    }
  } catch (dbErr) {
    console.error('[Calls] Failed to persist call record:', dbErr);
  }

  return ok(result);
});
