import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * DERIV TECH - Deriv Data Synchronization API
 *
 * Syncs markup statistics from Deriv's official REST API.
 * Uses upsert to prevent duplicate records (idempotent operation).
 *
 * Official endpoint: GET /applications/v1/markup-statistics
 * Requires: application_read scope + Deriv-App-ID header
 *
 * IMPORTANT: Running this endpoint multiple times will NOT create
 * duplicate records. The upsert uses (integration_id, record_date)
 * as the conflict key.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    // Get connected integrations for this organization
    let query = supabase
      .from('deriv_integrations')
      .select('id, organization_id, deriv_app_id, access_token')
      .eq('organization_id', member.organization_id)
      .eq('connection_status', 'connected');

    if (body.integrationId) {
      query = query.eq('id', body.integrationId);
    }

    const { data: integrations } = await query;

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ error: 'No connected integrations' }, { status: 400 });
    }

    // Sync each integration
    const results = [];
    for (const integration of integrations) {
      try {
        // Update status to syncing
        await supabase
          .from('deriv_integrations')
          .update({ connection_status: 'syncing' })
          .eq('id', integration.id);

        // Fetch markup statistics from Deriv REST API
        // Official endpoint: GET /applications/v1/markup-statistics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          date_from: thirtyDaysAgo.toISOString().split('T')[0],
          date_to: now.toISOString().split('T')[0],
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DERIV_API_BASE_URL}/applications/v1/markup-statistics?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Deriv-App-ID': integration.deriv_app_id,
            },
          }
        );

        if (response.ok) {
          const stats = await response.json();
          let syncedCount = 0;

          // Store markup records using upsert for idempotency
          // Duplicate runs will UPDATE existing records, not create new ones
          if (stats.total_markup_per_app && Array.isArray(stats.total_markup_per_app)) {
            for (const appStat of stats.total_markup_per_app) {
              const markupValue = parseFloat(String(appStat.markup || '0'));
              const contractCount = parseInt(String(appStat.contract_count || '0'), 10);

              // Skip invalid data
              if (isNaN(markupValue) || markupValue < 0) continue;

              const { error } = await supabase
                .from('markup_records')
                .upsert({
                  organization_id: member.organization_id,
                  integration_id: integration.id,
                  record_date: now.toISOString().split('T')[0],
                  total_markup: markupValue,
                  contract_count: contractCount,
                  total_volume: 0,
                  currency: 'USD',
                  source: 'deriv',
                }, {
                  onConflict: 'integration_id,record_date',
                });

              if (!error) syncedCount++;
            }
          }

          // Update integration sync status
          await supabase
            .from('deriv_integrations')
            .update({
              connection_status: 'connected',
              last_sync_at: now.toISOString(),
              last_successful_sync_at: now.toISOString(),
              sync_error: null,
            })
            .eq('id', integration.id);

          // Record sync job (for audit trail)
          await supabase
            .from('sync_jobs')
            .insert({
              organization_id: member.organization_id,
              integration_id: integration.id,
              status: 'completed',
              sync_type: 'markup',
              records_synced: syncedCount,
              started_at: now.toISOString(),
              completed_at: now.toISOString(),
            });

          results.push({ integrationId: integration.id, status: 'success', recordsSynced: syncedCount });
        } else if (response.status === 401) {
          // Token expired or revoked
          await supabase
            .from('deriv_integrations')
            .update({
              connection_status: 'error',
              sync_error: 'Authorization expired. Please reconnect your Deriv application.',
            })
            .eq('id', integration.id);

          results.push({ integrationId: integration.id, status: 'error', error: 'Authorization expired' });
        } else {
          throw new Error(`Deriv API returned status ${response.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase
          .from('deriv_integrations')
          .update({
            connection_status: 'error',
            sync_error: 'Sync failed. Please try again or reconnect.',
          })
          .eq('id', integration.id);

        results.push({ integrationId: integration.id, status: 'error', error: 'Sync failed' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
