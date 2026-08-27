// Shared between middleware (edge runtime) and lib/auth.ts (Node runtime).
// Deliberately has zero dependencies - importing bcryptjs or the Neon
// driver here would pull Node-only APIs (setImmediate, etc.) into the
// edge middleware bundle, which fails at runtime on Cloudflare Workers.

export const SESSION_COOKIE = 'session';

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: 'super_admin' | 'org_owner' | 'org_admin' | 'staff';
  [key: string]: unknown;
}
