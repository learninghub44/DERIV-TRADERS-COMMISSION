import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const integrations = await sql`
    SELECT * FROM deriv_integrations
    WHERE organization_id = ${ctx.orgId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ integrations });
}
