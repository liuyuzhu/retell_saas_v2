import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, verifyToken } from '@/lib/auth';

// Helper to get current user from cookie
async function getCurrentUser(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

// Fix user account - set as admin and ensure active (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check if current user is admin
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, newPassword, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Find user by email
    const { data: user, error: findError } = await client
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const updateData: Record<string, unknown> = {
      is_active: true,
    };

    if (role) {
      updateData.role = role;
    }

    // If new password provided, update it
    if (newPassword) {
      updateData.password_hash = await hashPassword(newPassword);
    }

    const { data: updatedUser, error: updateError } = await client
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, email, name, role, is_active, phone, created_at')
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Fix user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user info (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check if current user is admin
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { data: user, error } = await client
      .from('users')
      .select('id, email, name, role, is_active, phone, created_at, updated_at')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
