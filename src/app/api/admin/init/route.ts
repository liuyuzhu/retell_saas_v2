/**
 * POST /api/admin/init
 * One-time setup endpoint: creates the default admin account.
 *
 * Protected by SETUP_SECRET env var — must be provided in the request body.
 * Once an admin exists the endpoint becomes a no-op.
 *
 * GET /api/admin/init
 * Check whether an admin account exists (requires admin auth).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, validatePasswordStrength } from '@/lib/auth';
import { withAdmin, ok, err, Err } from '@/lib/api-helpers';

// ─── POST — one-time setup ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Allow operators to permanently disable this endpoint after initial setup
    if (process.env.SETUP_DISABLED === 'true') {
      return err('Setup endpoint is disabled.', 404);
    }

    // Verify the setup secret to prevent unauthorized admin creation
    const setupSecret = process.env.SETUP_SECRET;
    if (!setupSecret) {
      return err(
        'SETUP_SECRET environment variable is not configured. ' +
        'Set it to enable the admin initialization endpoint.',
        500
      );
    }

    let body: Record<string, string> = {};
    try { body = await request.json(); } catch { /* no body */ }

    if (body.setupSecret !== setupSecret) {
      return err('Invalid setup secret.', 403);
    }

    const client = getSupabaseClient();

    // Idempotent: if an admin already exists, succeed silently
    const { data: existing } = await client
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (existing) {
      return ok({ success: true, message: 'Admin account already exists.', adminExists: true });
    }

    // Resolve credentials from env — never hardcode defaults
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    if (!adminEmail || !adminPassword) {
      return err(
        'ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.',
        500
      );
    }

    const passwordError = validatePasswordStrength(adminPassword);
    if (passwordError) return err(`ADMIN_PASSWORD is too weak: ${passwordError}`, 400);

    const passwordHash = await hashPassword(adminPassword);

    const { data: admin, error } = await client
      .from('users')
      .insert({ email: adminEmail.toLowerCase(), password_hash: passwordHash, name: adminName, role: 'admin', is_active: true })
      .select('id, email, name, role')
      .single();

    if (error || !admin) {
      console.error('[Admin Init] Create error:', error);
      return Err.internal();
    }

    return ok({
      success: true,
      message: 'Admin account created successfully.',
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      // Never return the password — not even masked
    });
  } catch (error) {
    console.error('[Admin Init] Error:', error);
    return Err.internal();
  }
}

// ─── GET — status check (admin only) ─────────────────────────────────────────

export const GET = withAdmin(async () => {
  const client = getSupabaseClient();

  const { data: admin } = await client
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('role', 'admin')
    .limit(1)
    .single();

  return ok({ adminExists: !!admin, admin: admin ?? null });
});
