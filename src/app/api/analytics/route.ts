import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { orgId } = ctx;

  const dateRange = request.nextUrl.searchParams.get('dateRange') || '30';
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange, 10));
  const fromDate = daysAgo.toISOString().split('T')[0];

  const markupData = await sql`
    SELECT total_markup, record_date FROM markup_records
    WHERE organization_id = ${orgId} AND record_date >= ${fromDate}
  `;
  const commissionData = await sql`
    SELECT amount, record_date FROM commission_records
    WHERE organization_id = ${orgId} AND record_date >= ${fromDate}
  `;
  const topClients = await sql`
    SELECT * FROM clients
    WHERE organization_id = ${orgId}
    ORDER BY generated_markup DESC
    LIMIT 5
  `;

  return NextResponse.json({ markupData, commissionData, topClients });
}
