import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, withPrimary, ok, Err } from '@/lib/api-helpers';
import type { UpdatePhoneNumberRequest } from '@/lib/retell-types';

async function hasPhoneAccess(phoneNumber: string, userId: string, isAdminOrPrimary: boolean): Promise<boolean> {
  if (isAdminOrPrimary) return true;
  const client = getSupabaseClient();
  const { data } = await client
    .from('user_phone_numbers')
    .select('id')
    .eq('user_id', userId)
    .eq('phone_number', phoneNumber)
    .single();
  return !!data;
}

// ─── GET /api/phone-numbers/[number] ─────────────────────────────────────────

export const GET = withAuth(async (_req: NextRequest, ctx, params) => {
  const number = params?.number;
  if (!number) return Err.badRequest('Phone number is required.');

  const access = await hasPhoneAccess(number, ctx.user.userId, ctx.isAdmin || ctx.isPrimary);
  if (!access) return Err.notFound('Phone number not found or access denied.');

  const retell = getRetellClient();
  const result = await retell.getPhoneNumber(number);
  return ok({ ...result, canManage: ctx.isPrimary });
});

// ─── PATCH /api/phone-numbers/[number] — primary only ────────────────────────

export const PATCH = withPrimary(async (request: NextRequest, _ctx, params) => {
  const number = params?.number;
  if (!number) return Err.badRequest('Phone number is required.');

  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const retell = getRetellClient();
  const result = await retell.updatePhoneNumber(number, body as UpdatePhoneNumberRequest);
  return ok(result);
});

// ─── DELETE /api/phone-numbers/[number] — primary only ───────────────────────

export const DELETE = withPrimary(async (_req: NextRequest, _ctx, params) => {
  const number = params?.number;
  if (!number) return Err.badRequest('Phone number is required.');

  const retell = getRetellClient();
  const client = getSupabaseClient();

  await Promise.all([
    retell.deletePhoneNumber(number),
    client.from('user_phone_numbers').delete().eq('phone_number', number),
  ]);

  return ok({ success: true });
});
