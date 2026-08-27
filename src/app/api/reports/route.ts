import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { orgId } = ctx;

  const exportType = request.nextUrl.searchParams.get('export');
  if (exportType) {
    if (exportType === 'markup') {
      const data = await sql`SELECT * FROM markup_records WHERE organization_id = ${orgId}`;
      return NextResponse.json({ data });
    }
    if (exportType === 'commission') {
      const data = await sql`SELECT * FROM commission_records WHERE organization_id = ${orgId}`;
      return NextResponse.json({ data });
    }
    if (exportType === 'earnings') {
      const markupData = await sql`SELECT total_markup, record_date FROM markup_records WHERE organization_id = ${orgId}`;
      const commissionData = await sql`SELECT amount, record_date FROM commission_records WHERE organization_id = ${orgId}`;
      return NextResponse.json({ markupData, commissionData });
    }
    if (exportType === 'clients') {
      const data = await sql`SELECT * FROM clients WHERE organization_id = ${orgId}`;
      return NextResponse.json({ data });
    }
    if (exportType === 'trading') {
      const data = await sql`SELECT * FROM trading_activity WHERE organization_id = ${orgId}`;
      return NextResponse.json({ data });
    }
    return NextResponse.json({ data: [] });
  }

  const reports = await sql`
    SELECT * FROM reports
    WHERE organization_id = ${orgId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { user, orgId } = ctx;

  const { type, format } = await request.json();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO reports (organization_id, user_id, report_type, format, date_from, date_to, status)
    VALUES (
      ${orgId}, ${user.id}, ${type}, ${format},
      ${thirtyDaysAgo.toISOString().split('T')[0]}, ${now.toISOString().split('T')[0]},
      'completed'
    )
  `;

  return NextResponse.json({ ok: true });
}
