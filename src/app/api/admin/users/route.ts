import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, isPrimaryAccount } from '@/lib/auth';
import { withAdmin, withPrimary, ok, Err } from '@/lib/api-helpers';
import { CreateUserSchema } from '@/lib/validation';

// ─── GET /api/admin/users — list all users (admin only) ───────────────────────

export const GET = withAdmin(async () => {
  const client = getSupabaseClient();

  const { data: users, error } = await client
    .from('users')
    .select('id, email, name, role, phone, is_active, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin Users] Fetch error:', error);
    return Err.internal();
  }

  // Batch-fetch assignments in parallel
  const [{ data: userAgents }, { data: userPhoneNumbers }] = await Promise.all([
    client.from('user_agents').select('user_id, agent_id'),
    client.from('user_phone_numbers').select('user_id, phone_number'),
  ]);

  const enriched = (users ?? []).map(user => ({
    ...user,
    isPrimary: isPrimaryAccount(user.email),
    agents: (userAgents ?? []).filter(ua => ua.user_id === user.id).map(ua => ua.agent_id),
    phoneNumbers: (userPhoneNumbers ?? []).filter(upn => upn.user_id === user.id).map(upn => upn.phone_number),
  }));

  return ok({ success: true, data: enriched });
});

// ─── POST /api/admin/users — create a user (primary account only) ─────────────

export const POST = withPrimary(async (request: NextRequest) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');
  }

  const { email, password, name, phone, role, agentIds, phoneNumbers } = parsed.data;

  if (isPrimaryAccount(email)) {
    return Err.badRequest('Cannot create another primary account.');
  }

  const client = getSupabaseClient();

  // Check for duplicate
  const { data: existing } = await client
    .from('users').select('id').eq('email', email).limit(1).single();

  if (existing) return Err.badRequest('Email already registered.');

  const passwordHash = await hashPassword(password);

  const { data: newUser, error } = await client
    .from('users')
    .insert({ email, password_hash: passwordHash, name: name ?? email.split('@')[0], phone: phone ?? null, role, is_active: true })
    .select()
    .single();

  if (error || !newUser) {
    console.error('[Admin Users] Create error:', error);
    return Err.internal();
  }

  // Assign agents and phone numbers in parallel
  await Promise.all([
    agentIds?.length
      ? client.from('user_agents').insert(agentIds.map(id => ({ user_id: newUser.id, agent_id: id })))
      : Promise.resolve(),
    phoneNumbers?.length
      ? client.from('user_phone_numbers').insert(phoneNumbers.map(n => ({ user_id: newUser.id, phone_number: n })))
      : Promise.resolve(),
  ]);

  const { password_hash: _, ...userWithoutPassword } = newUser;
  return ok({ success: true, user: userWithoutPassword });
});
