import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';
import { getGuestConnection } from '@/lib/guest';

/**
 * DERIV TECH - Current Integration Status
 *
 * Returns the caller's org's Deriv integration, if any. Never returns
 * access_token/refresh_token - the client only needs status fields.
 */
export async function GET() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      const connection = await getGuestConnection();
      return NextResponse.json({
        integration: connection ? {
          derivAppId: connection.deriv_app_id,
          appName: 'Deriv Application',
          connectionStatus: connection.connection_status,
          authMethod: 'oauth',
          lastSyncAt: null,
          lastSuccessfulSyncAt: null,
          syncError: null,
          markupPercentage: '0',
          createdAt: null,
        } : null,
      });
    }

    const rows = await sql`
      SELECT id, deriv_app_id, app_name, connection_status, auth_method,
             last_sync_at, last_successful_sync_at, sync_error, markup_percentage, created_at
      FROM deriv_integrations
      WHERE organization_id = ${ctx.orgId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const integration = rows[0];

    if (!integration) {
      return NextResponse.json({ integration: null });
    }

    return NextResponse.json({
      integration: {
        id: integration.id,
        derivAppId: integration.deriv_app_id,
        appName: integration.app_name,
        connectionStatus: integration.connection_status,
        authMethod: integration.auth_method,
        lastSyncAt: integration.last_sync_at,
        lastSuccessfulSyncAt: integration.last_successful_sync_at,
        syncError: integration.sync_error,
        markupPercentage: integration.markup_percentage,
        createdAt: integration.created_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
