import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, isPrimaryAccount } from '@/lib/auth';
import { withAdmin, withPrimary, ok, Err } from '@/lib/api-helpers';
import { UpdateUserSchema } from '@/lib/validation';

// ─── GET /api/admin/users/[id] ────────────────────────────────────────────────

export const GET = withAdmin(async (_req: NextRequest, _ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('User ID is required.');

  const client = getSupabaseClient();

  const { data: user, error } = await client
    .from('users')
    .select('id, email, name, role, phone, is_active, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !user) return Err.notFound('User not found.');

  const [{ data: agents }, { data: phones }] = await Promise.all([
    client.from('user_agents').select('agent_id').eq('user_id', id),
    client.from('user_phone_numbers').select('phone_number').eq('user_id', id),
  ]);

  return ok({
    success: true,
    data: {
      ...user,
      isPrimary: isPrimaryAccount(user.email),
      agents: (agents ?? []).map(a => a.agent_id),
      phoneNumbers: (phones ?? []).map(p => p.phone_number),
    },
  });
});

// ─── PATCH /api/admin/users/[id] — primary only ───────────────────────────────

export const PATCH = withPrimary(async (request: NextRequest, _ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('User ID is required.');

  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { name, phone, is_active, role, agentIds, phoneNumbers } = parsed.data;
  const client = getSupabaseClient();

  const { data: existing } = await client
    .from('users').select('id, email').eq('id', id).single();

  if (!existing) return Err.notFound('User not found.');
  if (isPrimaryAccount(existing.email)) {
    return Err.forbidden('Cannot modify the primary account via this endpoint.');
  }

  // Update core fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (is_active !== undefined) updates.is_active = is_active;
  if (role !== undefined) updates.role = role;

  const { data: updated, error } = await client
    .from('users').update(updates).eq('id', id).select('id, email, name, role, phone, is_active').single();

  if (error || !updated) {
    console.error('[Admin Users] Update error:', error);
    return Err.internal();
  }

  // Replace agent/phone assignments if provided
  if (agentIds !== undefined) {
    await client.from('user_agents').delete().eq('user_id', id);
    if (agentIds.length > 0) {
      await client.from('user_agents').insert(agentIds.map(aid => ({ user_id: id, agent_id: aid })));
    }
  }

  if (phoneNumbers !== undefined) {
    await client.from('user_phone_numbers').delete().eq('user_id', id);
    if (phoneNumbers.length > 0) {
      await client.from('user_phone_numbers').insert(phoneNumbers.map(pn => ({ user_id: id, phone_number: pn })));
    }
  }

  return ok({ success: true, data: updated });
});

// ─── DELETE /api/admin/users/[id] — primary only ─────────────────────────────

export const DELETE = withPrimary(async (_req: NextRequest, _ctx, params) => {
  const id = params?.id;
  if (!id) return Err.badRequest('User ID is required.');

  const client = getSupabaseClient();

  const { data: user } = await client
    .from('users').select('email').eq('id', id).single();

  if (!user) return Err.notFound('User not found.');
  if (isPrimaryAccount(user.email)) {
    return Err.forbidden('Cannot delete the primary account.');
  }

  const { error } = await client.from('users').delete().eq('id', id);
  if (error) {
    console.error('[Admin Users] Delete error:', error);
    return Err.internal();
  }

  return ok({ success: true });
});
