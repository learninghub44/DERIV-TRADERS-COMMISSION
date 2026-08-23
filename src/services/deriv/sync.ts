import { createServiceSupabaseClient } from '@/lib/supabase/server';
import type { MarkupRecord, CommissionRecord, Client, TradingActivity, SyncJob } from '@/types';

export async function syncMarkupRecords(
  organizationId: string,
  integrationId: string,
  accessToken: string,
  appId: string,
  dateFrom: string,
  dateTo: string
): Promise<{ synced: number; error?: string }> {
  const supabase = await createServiceSupabaseClient();

  try {
    // Create sync job
    const { data: syncJob, error: syncJobError } = await supabase
      .from('sync_jobs')
      .insert({
        organization_id: organizationId,
        integration_id: integrationId,
        status: 'running',
        sync_type: 'markup',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (syncJobError) throw syncJobError;

    // Update integration status
    await supabase
      .from('deriv_integrations')
      .update({ connection_status: 'syncing' })
      .eq('id', integrationId);

    // Fetch from Deriv API
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });

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
        const { error } = await supabase
          .from('markup_records')
          .upsert({
            organization_id: organizationId,
            integration_id: integrationId,
            record_date: dateFrom,
            total_markup: parseFloat(appStat.markup || '0'),
            contract_count: parseInt(appStat.contract_count || '0', 10),
            total_volume: 0,
            currency: 'USD',
            source: 'deriv',
          }, {
            onConflict: 'integration_id,record_date',
          });

        if (!error) synced++;
      }
    }

    // Update sync job
    await supabase
      .from('sync_jobs')
      .update({
        status: 'completed',
        records_synced: synced,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncJob.id);

    // Update integration
    await supabase
      .from('deriv_integrations')
      .update({
        connection_status: 'connected',
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', integrationId);

    return { synced };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update integration with error
    await supabase
      .from('deriv_integrations')
      .update({
        connection_status: 'error',
        sync_error: errorMessage,
      })
      .eq('id', integrationId);

    return { synced: 0, error: errorMessage };
  }
}

export async function getMarkupRecords(
  organizationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<MarkupRecord[]> {
  const supabase = await createServiceSupabaseClient();

  let query = supabase
    .from('markup_records')
    .select('*')
    .eq('organization_id', organizationId)
    .order('record_date', { ascending: false });

  if (dateFrom) query = query.gte('record_date', dateFrom);
  if (dateTo) query = query.lte('record_date', dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTotalMarkup(
  organizationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<number> {
  const records = await getMarkupRecords(organizationId, dateFrom, dateTo);
  return records.reduce((sum, r) => sum + Number(r.total_markup), 0);
}
