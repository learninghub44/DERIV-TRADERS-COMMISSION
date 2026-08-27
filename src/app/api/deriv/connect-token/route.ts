import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getOrgContext } from '@/lib/org';
import { encrypt, maskSecret } from '@/lib/encryption';

/**
 * DERIV TECH - Manual API Token Connection
 *
 * Alternative to the OAuth flow: a customer who already has a Deriv
 * API token (Deriv account -> Settings -> API token) pastes it in
 * directly, along with the app_id it's tied to.
 *
 * SECURITY:
 * - Server-side only. The raw token is never echoed back to the client
 *   after this call - only a masked version (last 4 chars).
 * - The token is validated with a real call to Deriv before being stored,
 *   so we don't persist something that doesn't work.
 * - Stored encrypted (AES-256-GCM) via src/lib/encryption.ts, same as
 *   OAuth-issued tokens.
 */

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user, orgId } = ctx;

    const body = await request.json().catch(() => ({}));
    const appId = typeof body.appId === 'string' ? body.appId.trim() : '';
    const apiToken = typeof body.apiToken === 'string' ? body.apiToken.trim() : '';

    if (!appId || appId.length > 64) {
      return NextResponse.json({ error: 'A valid Deriv App ID is required' }, { status: 400 });
    }
    if (!apiToken || apiToken.length < 8 || apiToken.length > 512) {
      return NextResponse.json({ error: 'A valid Deriv API token is required' }, { status: 400 });
    }

    // Validate the token actually works before storing it.
    const testParams = new URLSearchParams({
      date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0],
    });

    const testResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DERIV_API_BASE_URL}/applications/v1/markup-statistics?${testParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Deriv-App-ID': appId,
        },
      }
    );

    if (testResponse.status === 401 || testResponse.status === 403) {
      return NextResponse.json(
        { error: 'Deriv rejected this token/App ID combination. Check both values and try again.' },
        { status: 400 }
      );
    }
    if (!testResponse.ok) {
      return NextResponse.json(
        { error: 'Could not verify this token with Deriv right now. Please try again shortly.' },
        { status: 502 }
      );
    }

    try {
      await sql`
        INSERT INTO deriv_integrations (
          organization_id, deriv_app_id, app_name, app_status, auth_method,
          access_token, refresh_token, token_expires_at, scope,
          connection_status, markup_percentage
        )
        VALUES (
          ${orgId}, ${appId}, 'Deriv Application (API Token)', 'active', 'api_token',
          ${encrypt(apiToken)}, NULL, NULL, ${['application_read']},
          'connected', 0
        )
        ON CONFLICT (organization_id, deriv_app_id)
        DO UPDATE SET
          app_name = EXCLUDED.app_name,
          auth_method = EXCLUDED.auth_method,
          access_token = EXCLUDED.access_token,
          refresh_token = NULL,
          token_expires_at = NULL,
          connection_status = 'connected'
      `;
    } catch {
      throw new Error('Failed to store integration');
    }

    await sql`
      INSERT INTO notifications (user_id, organization_id, title, message, type)
      VALUES (
        ${user.id}, ${orgId}, 'Deriv Application Connected',
        'Your Deriv application has been connected via API token. Markup data will sync automatically.',
        'success'
      )
    `;

    await sql`
      INSERT INTO audit_logs (actor_id, actor_email, organization_id, action, resource_type, details)
      VALUES (
        ${user.id}, ${user.email}, ${orgId}, 'deriv_connected', 'deriv_integration',
        ${JSON.stringify({ status: 'connected', auth_method: 'api_token' })}
      )
    `;

    return NextResponse.json({ success: true, maskedToken: maskSecret(apiToken) });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
