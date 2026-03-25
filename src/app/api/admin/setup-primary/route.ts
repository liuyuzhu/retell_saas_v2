/**
 * POST /api/admin/setup-primary
 * Creates or updates the primary (super-admin) account.
 *
 * Requires SETUP_SECRET in request body.
 * Does NOT return the password in the response.
 *
 * GET /api/admin/setup-primary
 * Returns the primary account status (admin only).
 */

import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, getPrimaryAccountEmail, validatePasswordStrength } from '@/lib/auth';
import { withAdmin, ok, err, Err } from '@/lib/api-helpers';

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Allow operators to permanently disable this endpoint after initial setup
    if (process.env.SETUP_DISABLED === 'true') {
      return err('Setup endpoint is disabled.', 404);
    }

    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) return err('SETUP_SECRET is not configured.', 500);

    let body: Record<string, string> = {};
    try { body = await request.json(); } catch { /* no body */ }

    if (body.setupSecret !== setupSecret) return err('Invalid setup secret.', 403);

    const primaryEmail = getPrimaryAccountEmail(); // from PRIMARY_ACCOUNT_EMAIL env
    const primaryPassword = body.password || process.env.PRIMARY_ACCOUNT_PASSWORD;
    const primaryName = body.name || 'Primary Administrator';

    if (!primaryPassword) {
      return err('Provide a password in the request body or set PRIMARY_ACCOUNT_PASSWORD.', 400);
    }

    const passwordError = validatePasswordStrength(primaryPassword);
    if (passwordError) return err(passwordError, 400);

    const client = getSupabaseClient();
    const passwordHash = await hashPassword(primaryPassword);

    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('email', primaryEmail)
      .limit(1)
      .single();

    if (existing) {
      const { data: updated, error } = await client
        .from('users')
        .update({ password_hash: passwordHash, role: 'admin', is_active: true, name: primaryName, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id, email, name, role')
        .single();

      if (error || !updated) {
        console.error('[Setup Primary] Update error:', error);
        return Err.internal();
      }

      return ok({ success: true, message: 'Primary account updated.', user: updated });
    }

    const { data: created, error: createError } = await client
      .from('users')
      .insert({ email: primaryEmail, password_hash: passwordHash, name: primaryName, role: 'admin', is_active: true })
      .select('id, email, name, role')
      .single();

    if (createError || !created) {
      console.error('[Setup Primary] Create error:', createError);
      return Err.internal();
    }

    return ok({ success: true, message: 'Primary account created.', user: created });
  } catch (error) {
    console.error('[Setup Primary] Error:', error);
    return Err.internal();
  }
}

// ─── GET — primary account status (admin only) ────────────────────────────────

export const GET = withAdmin(async () => {
  const client = getSupabaseClient();

  let primaryEmail: string;
  try { primaryEmail = getPrimaryAccountEmail(); }
  catch { return err('PRIMARY_ACCOUNT_EMAIL is not configured.', 500); }

  const { data: user } = await client
    .from('users')
    .select('id, email, name, role, is_active, created_at')
    .eq('email', primaryEmail)
    .single();

  if (!user) {
    return ok({ exists: false, primaryAccountEmail: primaryEmail });
  }

  return ok({ exists: true, primaryAccountEmail: primaryEmail, user });
});
