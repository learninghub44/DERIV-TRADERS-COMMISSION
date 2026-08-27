import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const integrations = await sql`
    SELECT di.*, o.name AS organization_name
    FROM deriv_integrations di
    JOIN organizations o ON o.id = di.organization_id
    ORDER BY di.created_at DESC
  `;

  return NextResponse.json({ integrations });
}
