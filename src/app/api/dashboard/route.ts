import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  const { orgId } = ctx;

  const integrations = await sql`
    SELECT connection_status, last_successful_sync_at
    FROM deriv_integrations
    WHERE organization_id = ${orgId}
  `;
  const isConnected = integrations.some((i: any) => i.connection_status === 'connected');
  const lastSync = integrations.reduce((latest: string | null, i: any) => {
    if (!latest || (i.last_successful_sync_at && i.last_successful_sync_at > latest)) {
      return i.last_successful_sync_at;
    }
    return latest;
  }, null as string | null);

  const markupRows = await sql`
    SELECT total_markup, record_date FROM markup_records
    WHERE organization_id = ${orgId}
    ORDER BY record_date DESC
  `;
  const totalMarkup = markupRows.reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0);

  const commissionRows = await sql`
    SELECT amount, record_date FROM commission_records
    WHERE organization_id = ${orgId}
    ORDER BY record_date DESC
  `;
  const totalCommissions = commissionRows.reduce((sum: number, r: any) => sum + parseFloat(String(r.amount || 0)), 0);

  const [{ count: clientCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM clients WHERE organization_id = ${orgId}
  `;

  const recentActivity = await sql`
    SELECT id, contract_type, external_contract_id, amount, result, contract_time
    FROM trading_activity
    WHERE organization_id = ${orgId}
    ORDER BY contract_time DESC
    LIMIT 5
  `;

  const topClients = await sql`
    SELECT id, external_client_id, total_contracts, generated_markup
    FROM clients
    WHERE organization_id = ${orgId}
    ORDER BY generated_markup DESC
    LIMIT 5
  `;

  const today = new Date().toISOString().split('T')[0];
  const todayMarkup = markupRows
    .filter((r: any) => r.record_date === today)
    .reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0);

  return NextResponse.json({
    totalEarnings: totalMarkup + totalCommissions,
    totalMarkup,
    totalCommissions,
    activeClients: clientCount || 0,
    totalContracts: recentActivity.length,
    todayMarkup,
    lastSyncAt: lastSync,
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    recentActivity,
    topClients,
  });
}
