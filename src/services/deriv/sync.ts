import { sql } from '@/lib/db';
import type { MarkupRecord } from '@/types';

export async function syncMarkupRecords(
  organizationId: string,
  integrationId: string,
  accessToken: string,
  appId: string,
  dateFrom: string,
  dateTo: string
): Promise<{ synced: number; error?: string }> {
  try {
    // Create sync job
    const syncJobRows = await sql`
      INSERT INTO sync_jobs (organization_id, integration_id, status, sync_type, started_at)
      VALUES (${organizationId}, ${integrationId}, 'running', 'markup', NOW())
      RETURNING id
    `;
    const syncJobId = syncJobRows[0].id;

    // Update integration status
    await sql`
      UPDATE deriv_integrations SET connection_status = 'syncing' WHERE id = ${integrationId}
    `;

    // Fetch from Deriv API
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DERIV_API_BASE_URL}/applications/v1/markup-statistics?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Deriv-App-ID': appId,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Deriv API returned ${response.status}`);
    }

    const stats = await response.json();
    let synced = 0;

    // Process and store records (upsert to prevent duplicates)
    if (stats.total_markup_per_app) {
      for (const appStat of stats.total_markup_per_app) {
        const totalMarkup = parseFloat(appStat.markup || '0');
        const contractCount = parseInt(appStat.contract_count || '0', 10);

        await sql`
          INSERT INTO markup_records (
            organization_id, integration_id, record_date, total_markup,
            contract_count, total_volume, currency, source
          )
          VALUES (
            ${organizationId}, ${integrationId}, ${dateFrom}, ${totalMarkup},
            ${contractCount}, 0, 'USD', 'deriv'
          )
          ON CONFLICT (integration_id, record_date)
          DO UPDATE SET
            total_markup = EXCLUDED.total_markup,
            contract_count = EXCLUDED.contract_count
        `;
        synced++;
      }
    }

    // Update sync job
    await sql`
      UPDATE sync_jobs
      SET status = 'completed', records_synced = ${synced}, completed_at = NOW()
      WHERE id = ${syncJobId}
    `;

    // Update integration
    await sql`
      UPDATE deriv_integrations
      SET connection_status = 'connected',
          last_sync_at = NOW(),
          last_successful_sync_at = NOW(),
          sync_error = NULL
      WHERE id = ${integrationId}
    `;

    return { synced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await sql`
      UPDATE deriv_integrations
      SET connection_status = 'error', sync_error = ${errorMessage}
      WHERE id = ${integrationId}
    `;

    return { synced: 0, error: errorMessage };
  }
}

export async function getMarkupRecords(
  organizationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MarkupRecord[]> {
  if (dateFrom && dateTo) {
    return (await sql`
      SELECT * FROM markup_records
      WHERE organization_id = ${organizationId}
        AND record_date >= ${dateFrom} AND record_date <= ${dateTo}
      ORDER BY record_date DESC
    `) as MarkupRecord[];
  }
  if (dateFrom) {
    return (await sql`
      SELECT * FROM markup_records
      WHERE organization_id = ${organizationId} AND record_date >= ${dateFrom}
      ORDER BY record_date DESC
    `) as MarkupRecord[];
  }
  if (dateTo) {
    return (await sql`
      SELECT * FROM markup_records
      WHERE organization_id = ${organizationId} AND record_date <= ${dateTo}
      ORDER BY record_date DESC
    `) as MarkupRecord[];
  }
  return (await sql`
    SELECT * FROM markup_records
    WHERE organization_id = ${organizationId}
    ORDER BY record_date DESC
  `) as MarkupRecord[];
}

export async function getTotalMarkup(
  organizationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<number> {
  const records = await getMarkupRecords(organizationId, dateFrom, dateTo);
  return records.reduce((sum, r) => sum + Number(r.total_markup), 0);
}
