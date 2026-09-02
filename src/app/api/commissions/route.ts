import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';
import { getGuestConnection } from '@/lib/guest';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) {
    const connection = await getGuestConnection();
    return NextResponse.json({
      records: [],
      connected: Boolean(connection),
      notification: connection ? null : {
        type: 'warning',
        title: 'No Deriv account connected',
        message: 'Connect your Deriv account to display commission statistics.',
      },
    });
  }

  const records = await sql`
    SELECT * FROM commission_records
    WHERE organization_id = ${ctx.orgId}
    ORDER BY record_date DESC
  `;

  return NextResponse.json({ records, connected: true, notification: null });
}
