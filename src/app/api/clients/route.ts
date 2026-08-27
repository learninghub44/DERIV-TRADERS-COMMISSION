import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const clients = await sql`
    SELECT * FROM clients
    WHERE organization_id = ${ctx.orgId}
    ORDER BY generated_markup DESC
  `;

  return NextResponse.json({ clients });
}
