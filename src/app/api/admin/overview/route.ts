import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [orgs, integrations, markupData, commissionData, users] = await Promise.all([
    sql`SELECT id, status FROM organizations`,
    sql`SELECT id, connection_status FROM deriv_integrations`,
    sql`SELECT total_markup FROM markup_records`,
    sql`SELECT amount FROM commission_records`,
    sql`SELECT id FROM users`,
  ]);

  return NextResponse.json({
    totalOrganizations: orgs.length,
    activeOrganizations: orgs.filter((o: any) => o.status === 'active').length,
    connectedApplications: integrations.filter((i: any) => i.connection_status === 'connected').length,
    totalMarkup: markupData.reduce((sum: number, r: any) => sum + Number(r.total_markup), 0),
    totalCommissions: commissionData.reduce((sum: number, r: any) => sum + Number(r.amount), 0),
    activeUsers: users.length,
    failedIntegrations: integrations.filter((i: any) => i.connection_status === 'error').length,
  });
}
