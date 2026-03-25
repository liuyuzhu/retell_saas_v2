/**
 * DB init endpoint — admin only for both GET and POST.
 * GET: check table status.
 * POST: verify tables exist and return SQL for missing ones.
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAdmin, ok } from '@/lib/api-helpers';

const TABLE_NAMES = ['users', 'user_calls', 'user_agents', 'user_phone_numbers', 'password_reset_tokens', 'system_configs'];

async function checkTables(): Promise<Record<string, boolean>> {
  const client = getSupabaseClient();
  const results: Record<string, boolean> = {};

  await Promise.all(
    TABLE_NAMES.map(async tableName => {
      try {
        const { error } = await client.from(tableName).select('id').limit(1);
        results[tableName] = !error || error.code !== '42P01';
      } catch {
        results[tableName] = false;
      }
    })
  );

  return results;
}

export const GET = withAdmin(async () => {
  const tables = await checkTables();
  return ok({ tables, allTablesExist: Object.values(tables).every(Boolean) });
});

export const POST = withAdmin(async () => {
  const tables = await checkTables();
  const missing = Object.entries(tables).filter(([, ok]) => !ok).map(([name]) => name);

  const sql = missing.length === 0 ? null : `-- Run in Supabase SQL Editor to create missing tables:

${missing.includes('user_calls') ? `CREATE TABLE IF NOT EXISTS user_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_id VARCHAR(255) UNIQUE NOT NULL,
  call_type VARCHAR(50) NOT NULL DEFAULT 'phone_call',
  agent_id VARCHAR(255),
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  call_status VARCHAR(50),
  start_timestamp BIGINT,
  end_timestamp BIGINT,
  duration_ms BIGINT,
  call_cost_usd DECIMAL(10,6),
  recording_url TEXT,
  transcript_url TEXT,
  sentiment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_calls_user_id ON user_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_call_id ON user_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_agent_id ON user_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_calls_start_timestamp ON user_calls(start_timestamp DESC);` : ''}`;

  return ok({
    success: true,
    tables,
    missing,
    allTablesExist: missing.length === 0,
    sql: sql ?? 'All tables exist.',
  });
});
