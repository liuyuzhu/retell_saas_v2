import { NextRequest, NextResponse } from 'next/server';

// GET /api/voices/[id] - Get a specific voice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RETELL_API_KEY is not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.retellai.com/get-voice/${encodeURIComponent(id)}`, {
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting voice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get voice' },
      { status: 500 }
    );
  }
}
