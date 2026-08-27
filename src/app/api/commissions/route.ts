import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const records = await sql`
    SELECT * FROM commission_records
    WHERE organization_id = ${ctx.orgId}
    ORDER BY record_date DESC
  `;

  return NextResponse.json({ records });
}
