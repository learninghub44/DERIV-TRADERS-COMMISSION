import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizations = await sql`
    SELECT * FROM organizations ORDER BY created_at DESC
  `;

  return NextResponse.json({ organizations });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orgId, status } = await request.json();
  if (!orgId || !status) {
    return NextResponse.json({ error: 'orgId and status are required.' }, { status: 400 });
  }

  await sql`UPDATE organizations SET status = ${status} WHERE id = ${orgId}`;

  return NextResponse.json({ ok: true });
}
