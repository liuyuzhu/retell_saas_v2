import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, withPrimary, ok, Err } from '@/lib/api-helpers';
import type { CreateAgentRequest } from '@/lib/retell-types';

// ─── GET /api/agents ──────────────────────────────────────────────────────────
// Admin/Primary: all agents. Tenant: assigned agents only.

export const GET = withAuth(async (request: NextRequest, ctx) => {
  const retell = getRetellClient();

  if (ctx.isAdmin || ctx.isPrimary) {
    const result = await retell.listAgents({});
    return ok({ ...result, canManage: ctx.isPrimary });
  }

  // Tenant: filter to assigned agents only
  const client = getSupabaseClient();
  const { data: assignments } = await client
    .from('user_agents')
    .select('agent_id')
    .eq('user_id', ctx.user.userId);

  if (!assignments || assignments.length === 0) {
    return ok({ data: [], has_more: false, canManage: false });
  }

  const assignedIds = new Set(assignments.map(a => a.agent_id));
  const result = await retell.listAgents({});
  const filtered = (result.data ?? []).filter(a => assignedIds.has(a.agent_id));

  return ok({ data: filtered, has_more: false, canManage: false });
});

// ─── POST /api/agents — primary account only ──────────────────────────────────

export const POST = withPrimary(async (request: NextRequest) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const retell = getRetellClient();
  const result = await retell.createAgent(body as CreateAgentRequest);
  return ok(result);
});
