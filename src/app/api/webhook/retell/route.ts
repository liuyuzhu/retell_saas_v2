import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { createHmac, timingSafeEqual } from 'crypto';

// ─── Signature verification ────────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature sent by Retell AI.
 * Retell sends: `x-retell-signature: sha256=<hex>`
 *
 * Set RETELL_WEBHOOK_SECRET in your environment to the secret from
 * Retell dashboard → Webhooks → Signing secret.
 */
function verifyRetellSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetellWebhookEvent {
  event: string;
  call_id?: string;
  agent_id?: string;
  phone_number_id?: string;
  from_number?: string;
  to_number?: string;
  call_status?: 'registered' | 'ongoing' | 'ended' | 'error';
  duration?: number;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, unknown>;
}

// ─── POST /api/webhook/retell ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Read raw body first (needed for HMAC verification)
  const rawBody = await request.text();

  // 2. Verify Retell signature
  const webhookSecret = process.env.RETELL_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] RETELL_WEBHOOK_SECRET is not set. Rejecting request.');
      return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    }
    console.warn('[Webhook] RETELL_WEBHOOK_SECRET not set — signature check skipped in dev mode.');
  } else {
    const signature = request.headers.get('x-retell-signature');
    if (!verifyRetellSignature(rawBody, signature, webhookSecret)) {
      console.warn('[Webhook] Invalid signature. Possible forged request.', {
        ip: request.headers.get('x-forwarded-for'),
      });
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
    }
  }

  // 3. Parse body
  let body: RetellWebhookEvent;
  try {
    body = JSON.parse(rawBody) as RetellWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { event, call_id, call_status, duration, recording_url, transcript, metadata } = body;

  console.log(`[Webhook] Received event: ${event}`, { call_id, call_status });

  if (!call_id) {
    return NextResponse.json({ received: true });
  }

  const client = getSupabaseClient();

  try {
    switch (event) {
      case 'call_started':
      case 'call.registered':
        await client.from('user_calls').upsert(
          {
            call_id,
            call_status: 'ongoing',
            agent_id: body.agent_id ?? null,
            from_number: body.from_number ?? null,
            to_number: body.to_number ?? null,
            phone_number_id: body.phone_number_id ?? null,
            start_timestamp: Date.now(),
            metadata: metadata ?? null,
          },
          { onConflict: 'call_id' }
        );
        break;

      case 'call_ended':
      case 'call.ended':
        await client
          .from('user_calls')
          .update({
            call_status: 'ended',
            end_timestamp: Date.now(),
            duration: duration ?? null,
            recording_url: recording_url ?? null,
            transcript: transcript ?? null,
            metadata: { ...(metadata ?? {}), ended_at: new Date().toISOString() },
          })
          .eq('call_id', call_id);
        break;

      case 'call.updated':
      case 'call_updated': // ← Fix: was duplicated 'call.updated'
        if (call_status) {
          const updateData: Record<string, unknown> = { call_status };
          if (call_status === 'error') {
            updateData.metadata = { ...(metadata ?? {}), error_at: new Date().toISOString() };
          }
          await client.from('user_calls').update(updateData).eq('call_id', call_id);
        }
        break;

      case 'transcript':
        console.log(`[Webhook] Transcript received for call ${call_id}`);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event}`);
    }
  } catch (dbError) {
    console.error('[Webhook] DB error while processing event:', event, dbError);
    // Return 200 so Retell does not keep retrying for transient DB errors.
  }

  return NextResponse.json({ received: true });
}

// ─── GET — Health check ───────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'retell-webhook' });
}
