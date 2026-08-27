import { neon } from '@neondatabase/serverless';

// @neondatabase/serverless talks to Neon over HTTP, so it works in edge
// runtimes (Cloudflare Workers via OpenNext) as well as Node.

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Configure your Neon connection string.');
  }
  return url;
}

/**
 * Tagged-template SQL query against Neon.
 *
 *   const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
 *
 * Values are sent as parameters (never interpolated into the query string),
 * so this is safe against SQL injection.
 */
export const sql = neon(getDatabaseUrl());

export type SqlRow = Record<string, any>;
