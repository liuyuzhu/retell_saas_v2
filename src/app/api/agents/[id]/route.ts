import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, withPrimary, ok, Err } from '@/lib/api-helpers';
import type { UpdateAgentRequest } from '@/lib/retell-types';

async function hasAgentAccess(agentId: string, userId: string, isAdminOrPrimary: boolean): Promise<boolean> {
  if (isAdminOrPrimary) return true;
  const client = getSupabaseClient();
  const { data } = await client
    .from('user_agents')
    .select('id')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single();
  return !!data;
}

// ─── GET /api/agents/[id] ─────────────────────────────────────────────────────

export const GET = withAuth(async (_req: NextRequest, ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('Agent ID is required.');

  const access = await hasAgentAccess(id, ctx.user.userId, ctx.isAdmin || ctx.isPrimary);
  if (!access) return Err.notFound('Agent not found or access denied.');

  const retell = getRetellClient();
  const result = await retell.getAgent(id);
  return ok({ ...result, canManage: ctx.isPrimary });
});

// ─── PATCH /api/agents/[id] — primary only ────────────────────────────────────

export const PATCH = withPrimary(async (request: NextRequest, _ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('Agent ID is required.');

  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const retell = getRetellClient();
  const result = await retell.updateAgent(id, body as UpdateAgentRequest);
  return ok(result);
});

// ─── DELETE /api/agents/[id] — primary only ───────────────────────────────────

export const DELETE = withPrimary(async (_req: NextRequest, _ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('Agent ID is required.');

  const retell = getRetellClient();
  const client = getSupabaseClient();

  await Promise.all([
    retell.deleteAgent(id),
    client.from('user_agents').delete().eq('agent_id', id),
  ]);

  return ok({ success: true });
});
