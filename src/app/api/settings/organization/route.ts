import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const orgRows = await sql`SELECT * FROM organizations WHERE id = ${ctx.orgId}`;
  const org = orgRows[0] || null;

  const members = await sql`
    SELECT om.*, u.email AS user_email, u.full_name AS user_full_name
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = ${ctx.orgId}
  `;

  return NextResponse.json({ org, members });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { name, website } = await request.json();

  await sql`
    UPDATE organizations SET name = ${name}, website = ${website} WHERE id = ${ctx.orgId}
  `;

  return NextResponse.json({ ok: true });
}
