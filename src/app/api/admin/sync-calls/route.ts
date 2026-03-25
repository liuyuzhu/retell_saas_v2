import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAdmin, ok, Err } from '@/lib/api-helpers';
import { SyncCallsSchema } from '@/lib/validation';

// ─── GET /api/admin/sync-calls — sync status ──────────────────────────────────

export const GET = withAdmin(async () => {
  const client = getSupabaseClient();
  const retell = getRetellClient();

  const [{ count: localCount }, retellResult] = await Promise.all([
    client.from('user_calls').select('*', { count: 'exact', head: true }),
    retell.listCalls({ limit: 1 }),
  ]);

  return ok({
    localCalls: localCount ?? 0,
    retellSample: retellResult.data?.length ?? 0,
    message: localCount
      ? `${localCount} calls stored locally.`
      : 'No local calls. Use POST to sync from Retell API.',
  });
});

// ─── POST /api/admin/sync-calls — import from Retell ─────────────────────────

export const POST = withAdmin(async (request: NextRequest) => {
  let body: unknown = {};
  try { body = await request.json(); } catch { /* no body */ }

  const parsed = SyncCallsSchema.safeParse(body);
  if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { userId, agentId, limit, syncAll } = parsed.data;
  const client = getSupabaseClient();
  const retell = getRetellClient();

  const result = await retell.listCalls({ limit: syncAll ? undefined : limit });
  if (!result.data?.length) {
    return ok({ success: true, message: 'No calls to sync.', syncedCount: 0 });
  }

  let callsToSync = result.data;

  // Filter by user's agents/phones when userId is specified
  if (userId) {
    const [{ data: userAgents }, { data: userPhones }] = await Promise.all([
      client.from('user_agents').select('agent_id').eq('user_id', userId),
      client.from('user_phone_numbers').select('phone_number').eq('user_id', userId),
    ]);

    const agentIds = new Set((userAgents ?? []).map(ua => ua.agent_id));
    const phones = new Set((userPhones ?? []).map(upn => upn.phone_number));

    callsToSync = callsToSync.filter(call =>
      (call.agent_id && agentIds.has(call.agent_id)) ||
      (call.from_number && phones.has(call.from_number)) ||
      (call.to_number && phones.has(call.to_number))
    );
  }

  if (agentId) {
    callsToSync = callsToSync.filter(call => call.agent_id === agentId);
  }

  const records = callsToSync.map(call => ({
    user_id: userId ?? null,
    call_id: call.call_id,
    call_type: call.call_type ?? 'phone_call',
    agent_id: call.agent_id ?? null,
    from_number: call.from_number ?? null,
    to_number: call.to_number ?? null,
    call_status: call.call_status ?? 'completed',
    start_timestamp: call.started_at ?? null,
    end_timestamp: call.ended_at ?? null,
    duration_ms: call.duration_ms ?? null,
    call_cost_usd: call.cost ?? null,
    recording_url: call.recording_url ?? null,
    sentiment: call.call_analysis?.user_sentiment ?? null,
    metadata: {
      call_direction: call.call_direction,
      disconnection_reason: call.disconnection_reason,
      call_successful: call.call_analysis?.call_successful,
    },
  }));

  // Batch upsert in chunks of 100 to avoid payload limits
  const CHUNK = 100;
  let syncedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const { error } = await client
      .from('user_calls')
      .upsert(chunk, { onConflict: 'call_id' });

    if (error) {
      console.error(`[Sync] Chunk ${i / CHUNK + 1} error:`, error);
      errorCount += chunk.length;
    } else {
      syncedCount += chunk.length;
    }
  }

  return ok({
    success: true,
    message: `Synced ${syncedCount} calls, ${errorCount} errors.`,
    syncedCount,
    errorCount,
    totalFetched: result.data.length,
    filtered: callsToSync.length,
  });
});
