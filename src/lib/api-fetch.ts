/**
 * api-fetch.ts
 * Global API fetch utility.
 *
 * ✅ Security fix: Authorization header injection removed.
 * Authentication is handled via the httpOnly cookie; `credentials: 'include'`
 * ensures the browser sends it automatically.
 */

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'include',
  });
}
