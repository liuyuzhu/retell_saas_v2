import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAdmin, withAuth, ok, Err } from '@/lib/api-helpers';

// Knowledge item types
interface KnowledgeItem {
  id: string;
  user_id: string;
  type: 'url' | 'document';
  title: string;
  content: string;
  source_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
}

// GET /api/knowledge - List knowledge items
export const GET = withAuth(async (request: NextRequest, ctx) => {
  const client = getSupabaseClient();
  
  try {
    let query = client
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    // Regular users can only see their own items
    if (!ctx.isAdmin) {
      query = query.eq('user_id', ctx.user.userId);
    }

    const { data: items, error, count } = await query;

    if (error) {
      console.error('[Knowledge] Fetch error:', error);
      // If table doesn't exist, return empty
      if (error.code === 'PGRST204' || error.code === 'PGRST205') {
        return ok({ data: [], count: 0 });
      }
      return Err.internal();
    }

    return ok({ data: items ?? [], count: count ?? 0 });
  } catch (err) {
    console.error('[Knowledge] Unexpected error:', err);
    return ok({ data: [], count: 0 });
  }
});

// POST /api/knowledge - Add new knowledge item (Admin only for global, users for personal)
export const POST = withAuth(async (request: NextRequest, ctx) => {
  const client = getSupabaseClient();
  
  try {
    const body = await request.json();
    const { type, title, content, source_url, file_name, file_size } = body;

    if (!type || !title || !content) {
      return Err.badRequest('Type, title, and content are required');
    }

    if (!['url', 'document'].includes(type)) {
      return Err.badRequest('Invalid type. Must be "url" or "document"');
    }

    // Determine user_id - admins can add global knowledge (null user_id)
    const userId = ctx.isAdmin && body.is_global ? null : ctx.user.userId;

    const { data, error } = await client
      .from('knowledge_base')
      .insert({
        user_id: userId,
        type,
        title,
        content,
        source_url: source_url || null,
        file_name: file_name || null,
        file_size: file_size || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Knowledge] Insert error:', error);
      return Err.internal();
    }

    return ok({ data, success: true });
  } catch (err) {
    console.error('[Knowledge] Unexpected error:', err);
    return Err.internal();
  }
});

// DELETE /api/knowledge - Delete knowledge item
export const DELETE = withAuth(async (request: NextRequest, ctx) => {
  const client = getSupabaseClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Err.badRequest('Knowledge item ID is required');
    }

    // Check ownership (admins can delete anything)
    if (!ctx.isAdmin) {
      const { data: item } = await client
        .from('knowledge_base')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!item || item.user_id !== ctx.user.userId) {
        return Err.forbidden('Access denied');
      }
    }

    const { error } = await client
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Knowledge] Delete error:', error);
      return Err.internal();
    }

    return ok({ success: true });
  } catch (err) {
    console.error('[Knowledge] Unexpected error:', err);
    return Err.internal();
  }
});
