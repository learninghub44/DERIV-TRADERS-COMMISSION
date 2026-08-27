import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const rows = await sql`
    UPDATE users
    SET email_verified = TRUE, email_verify_token = NULL
    WHERE email_verify_token = ${token}
    RETURNING id
  `;

  if (rows.length === 0) {
    return NextResponse.redirect(`${origin}/login?error=invalid_verify_token`);
  }

  return NextResponse.redirect(`${origin}/login?verified=1`);
}
