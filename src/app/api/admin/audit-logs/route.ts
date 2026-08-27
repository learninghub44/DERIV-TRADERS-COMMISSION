import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const logs = await sql`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return NextResponse.json({ logs });
}
