import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const rows = await sql`
    SELECT id, email, password_hash, role
    FROM users
    WHERE email = ${String(email).toLowerCase()}
  `;
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
