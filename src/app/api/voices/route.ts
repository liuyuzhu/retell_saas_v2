import { NextRequest, NextResponse } from 'next/server';

// GET /api/voices - List all voices
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // 默认限制返回数量
    const limit = searchParams.get('limit') ? Math.min(parseInt(searchParams.get('limit')!), 50) : 50;

    // 直接调用 Retell API 避免 SDK 问题
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RETELL_API_KEY is not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.retellai.com/list-voices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Retell API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    // 限制返回数量
    const limitedData = Array.isArray(data) ? data.slice(0, limit) : [];
    
    return NextResponse.json({ data: limitedData, has_more: Array.isArray(data) && data.length > limit });
  } catch (error) {
    console.error('Error listing voices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list voices' },
      { status: 500 }
    );
  }
}
