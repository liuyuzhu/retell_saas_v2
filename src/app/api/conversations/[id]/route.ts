import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { withAuth, ok, Err } from '@/lib/api-helpers';

// GET /api/conversations/[id] - Get a specific conversation
export const GET = withAuth(async (request: NextRequest, ctx, params) => {
  const callId = params?.id;
  if (!callId) return Err.badRequest('Missing conversation ID');
  
  const client = getSupabaseClient();

  try {
    const { data: conversation, error } = await client
      .from('user_calls')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (error) {
      console.error('[Conversations] Get error:', error);
      return Err.notFound('Conversation not found');
    }

    return ok(conversation);
  } catch (err) {
    console.error('[Conversations] Unexpected error:', err);
    return Err.internal();
  }
});

// DELETE /api/conversations/[id] - Delete a conversation
export const DELETE = withAuth(async (request: NextRequest, ctx, params) => {
  const callId = params?.id;
  if (!callId) return Err.badRequest('Missing conversation ID');
  
  const client = getSupabaseClient();

  try {
    const { error } = await client
      .from('user_calls')
      .delete()
      .eq('call_id', callId);

    if (error) {
      console.error('[Conversations] Delete error:', error);
      return Err.internal();
    }

    return ok({ success: true });
  } catch (err) {
    console.error('[Conversations] Unexpected error:', err);
    return Err.internal();
  }
});
