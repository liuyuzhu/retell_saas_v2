import { getSupabaseClient } from '@/storage/database/supabase-client';
import { ok, Err } from '@/lib/api-helpers';

// No auth — public config endpoint (only returns rows marked is_public=true)
export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: configs, error } = await client
      .from('system_configs')
      .select('config_key, config_value')
      .eq('is_public', true);

    if (error) {
      console.error('[Public Config] Fetch error:', error);
      return Err.internal();
    }

    const data = (configs ?? []).reduce((acc, cfg) => {
      acc[cfg.config_key] = cfg.config_value;
      return acc;
    }, {} as Record<string, string>);

    return ok({ success: true, data });
  } catch (error) {
    console.error('[Public Config] Error:', error);
    return Err.internal();
  }
}
