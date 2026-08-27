import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { sql } from './db';
import { SESSION_COOKIE, type SessionPayload } from './session';

export { SESSION_COOKIE, type SessionPayload };

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: SessionPayload['role'];
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// JWT session tokens
// ---------------------------------------------------------------------------

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers (server components / route handlers)
// ---------------------------------------------------------------------------

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Reads and verifies the session cookie, returning the JWT payload only
 * (no DB round trip). Use in middleware / places that just need identity+role.
 */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Reads the session and loads the fresh user record from Neon.
 * Use in API routes / server components that need up-to-date profile data.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;

  const rows = await sql`
    SELECT id, email, full_name, avatar_url, role
    FROM users
    WHERE id = ${payload.sub}
  `;
  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    role: user.role,
  };
}
