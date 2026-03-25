import { clearAuthCookie } from '@/lib/auth';
import { ok } from '@/lib/api-helpers';

export async function POST() {
  await clearAuthCookie();
  return ok({ success: true });
}
