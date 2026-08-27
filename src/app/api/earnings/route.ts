import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { orgId } = ctx;

  const markupData = await sql`
    SELECT total_markup, record_date FROM markup_records WHERE organization_id = ${orgId}
  `;
  const commissionData = await sql`
    SELECT amount, record_date FROM commission_records WHERE organization_id = ${orgId}
  `;

  return NextResponse.json({ markupData, commissionData });
}
