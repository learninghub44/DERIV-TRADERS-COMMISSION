import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';
import { decrypt, encrypt } from '@/lib/encryption';
import { refreshAccessToken, getDerivClientId } from '@/services/deriv/auth';

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
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { orgId } = ctx;

    const body = await request.json().catch(() => ({}));

    // Get connected integrations for this organization
    const integrations = body.integrationId
      ? await sql`
          SELECT id, organization_id, deriv_app_id, access_token, refresh_token, auth_method
          FROM deriv_integrations
          WHERE organization_id = ${orgId} AND connection_status = 'connected' AND id = ${body.integrationId}
        `
      : await sql`
          SELECT id, organization_id, deriv_app_id, access_token, refresh_token, auth_method
          FROM deriv_integrations
          WHERE organization_id = ${orgId} AND connection_status = 'connected'
        `;

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ error: 'No connected integrations' }, { status: 400 });
    }

    // Sync each integration
    const results = [];
    for (const integration of integrations) {
      try {
        // Update status to syncing
        await sql`UPDATE deriv_integrations SET connection_status = 'syncing' WHERE id = ${integration.id}`;

        // Fetch markup statistics from Deriv REST API
        // Official endpoint: GET /applications/v1/markup-statistics
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          date_from: thirtyDaysAgo.toISOString().split('T')[0],
          date_to: now.toISOString().split('T')[0],
        });

        let plaintextToken: string;
        try {
          plaintextToken = decrypt(integration.access_token);
        } catch {
          throw new Error('Stored credential could not be decrypted');
        }

        const derivApiUrl = `${process.env.NEXT_PUBLIC_DERIV_API_BASE_URL}/applications/v1/markup-statistics?${params.toString()}`;

        let response = await fetch(derivApiUrl, {
          headers: {
            'Authorization': `Bearer ${plaintextToken}`,
            'Deriv-App-ID': integration.deriv_app_id,
          },
        });

        // If the access token expired, try a silent refresh (OAuth
        // connections only - manual API tokens have no refresh token
        // and must be reconnected by the user).
        if (response.status === 401 && integration.auth_method === 'oauth' && integration.refresh_token) {
          try {
            const plaintextRefresh = decrypt(integration.refresh_token);
            const refreshed = await refreshAccessToken(
              plaintextRefresh,
              await getDerivClientId()
            );

            plaintextToken = refreshed.access_token;

            await sql`
              UPDATE deriv_integrations
              SET access_token = ${encrypt(refreshed.access_token)},
                  refresh_token = ${refreshed.refresh_token ? encrypt(refreshed.refresh_token) : integration.refresh_token},
                  token_expires_at = ${refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null}
              WHERE id = ${integration.id}
            `;

            response = await fetch(derivApiUrl, {
              headers: {
                'Authorization': `Bearer ${plaintextToken}`,
                'Deriv-App-ID': integration.deriv_app_id,
              },
            });
          } catch {
            // Refresh failed - fall through with the original 401 response,
            // handled below as "authorization expired".
          }
        }

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

              try {
                await sql`
                  INSERT INTO markup_records (
                    organization_id, integration_id, record_date, total_markup,
                    contract_count, total_volume, currency, source
                  )
                  VALUES (
                    ${orgId}, ${integration.id}, ${now.toISOString().split('T')[0]}, ${markupValue},
                    ${contractCount}, 0, 'USD', 'deriv'
                  )
                  ON CONFLICT (integration_id, record_date)
                  DO UPDATE SET
                    total_markup = EXCLUDED.total_markup,
                    contract_count = EXCLUDED.contract_count
                `;
                syncedCount++;
              } catch {
                // Skip this record, continue with the rest
              }
            }
          }

          // Update integration sync status
          await sql`
            UPDATE deriv_integrations
            SET connection_status = 'connected',
                last_sync_at = ${now.toISOString()},
                last_successful_sync_at = ${now.toISOString()},
                sync_error = NULL
            WHERE id = ${integration.id}
          `;

          // Record sync job (for audit trail)
          await sql`
            INSERT INTO sync_jobs (
              organization_id, integration_id, status, sync_type,
              records_synced, started_at, completed_at
            )
            VALUES (
              ${orgId}, ${integration.id}, 'completed', 'markup',
              ${syncedCount}, ${now.toISOString()}, ${now.toISOString()}
            )
          `;

          results.push({ integrationId: integration.id, status: 'success', recordsSynced: syncedCount });
        } else if (response.status === 401) {
          // Token expired/revoked and refresh (if applicable) didn't help
          await sql`
            UPDATE deriv_integrations
            SET connection_status = 'error',
                sync_error = ${
                  integration.auth_method === 'oauth'
                    ? 'Authorization expired and could not be refreshed. Please reconnect your Deriv application.'
                    : 'This API token is no longer valid. Please generate a new one and reconnect.'
                }
            WHERE id = ${integration.id}
          `;

          results.push({ integrationId: integration.id, status: 'error', error: 'Authorization expired' });
        } else {
          throw new Error(`Deriv API returned status ${response.status}`);
        }
      } catch (error) {
        await sql`
          UPDATE deriv_integrations
          SET connection_status = 'error', sync_error = 'Sync failed. Please try again or reconnect.'
          WHERE id = ${integration.id}
        `;

        results.push({ integrationId: integration.id, status: 'error', error: 'Sync failed' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
