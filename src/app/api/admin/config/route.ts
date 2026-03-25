import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAdmin, ok, Err } from '@/lib/api-helpers';
import { UpdateConfigsSchema, CreateConfigSchema } from '@/lib/validation';

// ─── GET /api/admin/config ────────────────────────────────────────────────────

export const GET = withAdmin(async (request: NextRequest) => {
  const client = getSupabaseClient();
  const category = request.nextUrl.searchParams.get('category');

  let query = client.from('system_configs').select('*').order('category').order('config_key');
  if (category) query = query.eq('category', category);

  const { data: configs, error } = await query;
  if (error) {
    console.error('[Admin Config] Fetch error:', error);
    return Err.internal();
  }

  const grouped = (configs ?? []).reduce((acc, cfg) => {
    acc[cfg.category] = acc[cfg.category] ?? [];
    acc[cfg.category].push(cfg);
    return acc;
  }, {} as Record<string, typeof configs>);

  return ok({ success: true, data: configs, grouped });
});

// ─── PATCH /api/admin/config — bulk update ────────────────────────────────────

export const PATCH = withAdmin(async (request: NextRequest) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const parsed = UpdateConfigsSchema.safeParse(body);
  if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const client = getSupabaseClient();
  const { configs } = parsed.data;

  // Execute all updates in parallel instead of sequential for-loop
  const results = await Promise.all(
    configs
      .filter(c => c.config_key)
      .map(({ config_key, config_value }) =>
        client
          .from('system_configs')
          .update({ config_value, updated_at: new Date().toISOString() })
          .eq('config_key', config_key)
          .select()
          .single()
      )
  );

  const updated = results.filter(r => !r.error && r.data).map(r => r.data!);
  const failed = results.filter(r => r.error).length;

  if (failed > 0) {
    console.warn(`[Admin Config] ${failed} updates failed out of ${configs.length}`);
  }

  return ok({ success: true, updated: updated.length, failed, data: updated });
});

// ─── POST /api/admin/config — create new config ───────────────────────────────

export const POST = withAdmin(async (request: NextRequest) => {
  let body: unknown;
  try { body = await request.json(); } catch { return Err.badRequest('Request body is required.'); }

  const parsed = CreateConfigSchema.safeParse(body);
  if (!parsed.success) return Err.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const client = getSupabaseClient();
  const { data, error } = await client.from('system_configs').insert(parsed.data).select().single();

  if (error) {
    if (error.code === '23505') return Err.badRequest('Configuration key already exists.');
    console.error('[Admin Config] Create error:', error);
    return Err.internal();
  }

  return ok({ success: true, data });
});
