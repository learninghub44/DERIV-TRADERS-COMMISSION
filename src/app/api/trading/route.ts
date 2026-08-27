import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const activities = await sql`
    SELECT * FROM trading_activity
    WHERE organization_id = ${ctx.orgId}
    ORDER BY contract_time DESC
    LIMIT 200
  `;

  return NextResponse.json({ activities });
}
