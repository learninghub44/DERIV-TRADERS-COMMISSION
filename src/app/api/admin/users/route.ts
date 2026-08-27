import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await sql`
    SELECT id, email, full_name, role, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ users });
}
