import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST { email } -> request a reset link (always returns ok to avoid email enumeration)
export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase();
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await sql`
    UPDATE users
    SET password_reset_token = ${token}, password_reset_expires_at = ${expiresAt.toISOString()}
    WHERE email = ${normalizedEmail}
  `;

  // TODO: email the token via SMTP_* env vars. Deliberately not confirming
  // whether the account exists in the response, to avoid email enumeration.

  return NextResponse.json({ ok: true });
}

// PUT { token, password } -> confirm a reset
export async function PUT(request: NextRequest) {
  const { token, password } = await request.json();
  if (!token || !password) {
    return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const rows = await sql`
    SELECT id FROM users
    WHERE password_reset_token = ${token} AND password_reset_expires_at > NOW()
  `;
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, password_reset_token = NULL, password_reset_expires_at = NULL
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}
