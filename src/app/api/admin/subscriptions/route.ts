import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const subscriptions = await sql`
    SELECT s.*, o.name AS organization_name
    FROM subscriptions s
    JOIN organizations o ON o.id = s.organization_id
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ subscriptions });
}
