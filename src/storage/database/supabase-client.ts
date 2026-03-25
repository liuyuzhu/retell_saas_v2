/**
 * supabase-client.ts
 * Provides a Supabase client configured from environment variables.
 *
 * Removed: execSync Python subprocess (was blocking the event loop and
 * introduced shell-injection risk). Use standard env vars or dotenv instead.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Credentials ─────────────────────────────────────────────────────────────

function getCredentials(): { url: string; anonKey: string } {
  const url = process.env.COZE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error('[Supabase] SUPABASE_URL (or COZE_SUPABASE_URL) is not set.');
  if (!anonKey) throw new Error('[Supabase] SUPABASE_ANON_KEY (or COZE_SUPABASE_ANON_KEY) is not set.');

  return { url, anonKey };
}

// ─── Client factory ───────────────────────────────────────────────────────────

const CLIENT_OPTIONS = {
  auth: { autoRefreshToken: false, persistSession: false },
};

/**
 * Returns a Supabase client.
 * Uses a module-level singleton for the default (service) client
 * to avoid re-creating the connection on every request.
 */
let _defaultClient: SupabaseClient | null = null;

export function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getCredentials();

  // Per-request client when a user token is provided (e.g. for RLS)
  if (token) {
    return createClient(url, anonKey, {
      ...CLIENT_OPTIONS,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  // Singleton for server-side service calls
  if (!_defaultClient) {
    _defaultClient = createClient(url, anonKey, CLIENT_OPTIONS);
  }

  return _defaultClient;
}
