import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ key: string }>;
}

// GET /api/admin/config/[key] - Get single configuration
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { key } = await params;
    const client = getSupabaseClient();

    const { data: config, error } = await client
      .from('system_configs')
      .select('*')
      .eq('config_key', key)
      .single();

    if (error || !config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/config/[key] - Delete configuration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { key } = await params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('system_configs')
      .delete()
      .eq('config_key', key);

    if (error) {
      console.error('Error deleting config:', error);
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted',
    });
  } catch (error) {
    console.error('Delete config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
