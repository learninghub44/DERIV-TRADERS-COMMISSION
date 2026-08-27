import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { orgId } = ctx;

  const integrationRows = await sql`
    SELECT markup_percentage FROM deriv_integrations
    WHERE organization_id = ${orgId} AND connection_status = 'connected'
    LIMIT 1
  `;
  const markupPct = Number(integrationRows[0]?.markup_percentage || 0);

  const records = await sql`
    SELECT total_markup, contract_count, record_date FROM markup_records
    WHERE organization_id = ${orgId}
    ORDER BY record_date DESC
  `;

  return NextResponse.json({ markupPct, records });
}
