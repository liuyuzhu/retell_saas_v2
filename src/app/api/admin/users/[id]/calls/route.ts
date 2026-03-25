import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]/calls - Get user's call records (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = getSupabaseClient();

    // Get user's call records
    const { data: calls, error } = await client
      .from('user_calls')
      .select('*')
      .eq('user_id', id)
      .order('start_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching call records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch call records' },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await client
      .from('user_calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    return NextResponse.json({
      success: true,
      data: calls || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get user calls error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
