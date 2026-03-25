import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, ok, Err, type AuthContext } from '@/lib/api-helpers';

// ─── Ownership check helper ───────────────────────────────────────────────────

async function assertCallAccess(callId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const client = getSupabaseClient();
  const { data } = await client
    .from('user_calls')
    .select('id')
    .eq('call_id', callId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

// ─── GET /api/calls/[id] ─────────────────────────────────────────────────────

export const GET = withAuth(async (_req: NextRequest, ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('Call ID is required.');

  const hasAccess = await assertCallAccess(id, ctx.user.userId, ctx.isAdmin);
  if (!hasAccess) return Err.notFound('Call not found or access denied.');

  const retell = getRetellClient();
  const result = await retell.getCall(id);

  // Update local record in background (best-effort)
  const client = getSupabaseClient();
  void client.from('user_calls').upsert({
    call_id: id,
    call_type: result.call_type ?? 'phone_call',
    agent_id: result.agent_id ?? null,
    from_number: result.from_number ?? null,
    to_number: result.to_number ?? null,
    call_status: result.call_status ?? 'unknown',
    start_timestamp: result.started_at ?? null,
    end_timestamp: result.ended_at ?? null,
    duration_ms: result.duration_ms ?? null,
    call_cost_usd: result.cost ?? null,
    recording_url: result.recording_url ?? null,
    sentiment: result.call_analysis?.user_sentiment ?? null,
    metadata: {
      call_direction: result.call_direction,
      disconnection_reason: result.disconnection_reason,
      call_successful: result.call_analysis?.call_successful,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'call_id' });

  return ok(result);
});

// ─── DELETE /api/calls/[id] ──────────────────────────────────────────────────

export const DELETE = withAuth(async (_req: NextRequest, ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('Call ID is required.');

  const hasAccess = await assertCallAccess(id, ctx.user.userId, ctx.isAdmin);
  if (!hasAccess) return Err.notFound('Call not found or access denied.');

  const retell = getRetellClient();
  const client = getSupabaseClient();

  await Promise.all([
    retell.deleteCall(id),
    client.from('user_calls').delete().eq('call_id', id),
  ]);

  return ok({ success: true });
});
