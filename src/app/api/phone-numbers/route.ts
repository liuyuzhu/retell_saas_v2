import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getRetellClient } from '@/lib/retell-client';
import { withAuth, withPrimary, ok, Err } from '@/lib/api-helpers';
import type { CreatePhoneNumberRequest } from '@/lib/retell-types';

// ─── GET /api/phone-numbers ───────────────────────────────────────────────────

export const GET = withAuth(async (_req: NextRequest, ctx) => {
  const retell = getRetellClient();

  if (ctx.isAdmin || ctx.isPrimary) {
    const result = await retell.listPhoneNumbers({});
    return ok({ ...result, canManage: ctx.isPrimary });
  }

  const client = getSupabaseClient();
  const { data: assignments } = await client
    .from('user_phone_numbers')
    .select('phone_number')
    .eq('user_id', ctx.user.userId);

  if (!assignments || assignments.length === 0) {
    return ok({ data: [], has_more: false, canManage: false });
  }

  const assignedNums = new Set(assignments.map(a => a.phone_number));
  const result = await retell.listPhoneNumbers({});
  const filtered = (result.data ?? []).filter(pn => assignedNums.has(pn.phone_number));

  return ok({ data: filtered, has_more: false, canManage: false });
});

// ─── POST /api/phone-numbers — primary only ───────────────────────────────────

export const POST = withPrimary(async (request: NextRequest) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const { phone_number } = body as CreatePhoneNumberRequest;
  if (!phone_number) return Err.badRequest('phone_number is required.');

  const retell = getRetellClient();
  const result = await retell.createPhoneNumber(body as CreatePhoneNumberRequest);
  return ok(result);
});
