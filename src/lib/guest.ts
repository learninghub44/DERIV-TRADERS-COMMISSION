import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { sql } from './db';

export const GUEST_COOKIE = 'deriv_guest_id';

export async function getGuestId(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value || null;
}

export function isGuestId(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f-]{36}$/i.test(value));
}

export function createGuestId(): string {
  return randomUUID();
}

export async function getGuestConnection() {
  const visitorId = await getGuestId();
  if (!isGuestId(visitorId)) return null;

  try {
    const rows = await sql`
      SELECT visitor_id, deriv_app_id, access_token, refresh_token,
             token_expires_at, connection_status
      FROM guest_deriv_connections
      WHERE visitor_id = ${visitorId}
        AND connection_status = 'connected'
      LIMIT 1
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}