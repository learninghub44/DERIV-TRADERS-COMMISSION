import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';
import { getGuestId, isGuestId } from '@/lib/guest';

/**
 * DERIV TECH - Deriv Integration Disconnect
 *
 * Safely disconnects a Deriv integration by:
 * - Setting status to disconnected
 * - Clearing stored tokens
 * - Creating an audit log entry
 *
 * SECURITY: Does not expose sensitive error details.
 */

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      const visitorId = await getGuestId();
      if (!isGuestId(visitorId)) return NextResponse.json({ success: true });
      await sql`
        UPDATE guest_deriv_connections
        SET connection_status = 'disconnected', access_token = '', refresh_token = NULL,
            token_expires_at = NULL, updated_at = NOW()
        WHERE visitor_id = ${visitorId}
      `;
      return NextResponse.json({ success: true });
    }
    const { user, orgId } = ctx;

    const { integrationId } = await request.json();

    if (!integrationId || typeof integrationId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify ownership and disconnect
    try {
      await sql`
        UPDATE deriv_integrations
        SET connection_status = 'disconnected',
            access_token = NULL,
            refresh_token = NULL,
            token_expires_at = NULL,
            sync_error = NULL
        WHERE id = ${integrationId} AND organization_id = ${orgId}
      `;
    } catch {
      throw new Error('Failed to disconnect');
    }

    // Create notification
    await sql`
      INSERT INTO notifications (user_id, organization_id, title, message, type)
      VALUES (
        ${user.id}, ${orgId}, 'Deriv Application Disconnected',
        'Your Deriv application has been disconnected. Historical data is preserved.',
        'info'
      )
    `;

    // Audit log (no sensitive data exposed)
    await sql`
      INSERT INTO audit_logs (actor_id, actor_email, organization_id, action, resource_type, resource_id)
      VALUES (${user.id}, ${user.email}, ${orgId}, 'deriv_disconnected', 'deriv_integration', ${integrationId})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
