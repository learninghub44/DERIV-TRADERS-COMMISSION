import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { exchangeCodeForToken, getDerivClientId, getDerivRedirectUri } from '@/services/deriv/auth';
import { encrypt } from '@/lib/encryption';
import { GUEST_COOKIE, isGuestId } from '@/lib/guest';

/**
 * DERIV TECH - Deriv OAuth 2.0 Callback Handler
 *
 * This route handles the OAuth 2.0 callback from Deriv after user authorization.
 * It exchanges the authorization code for an access token and stores the integration.
 *
 * IMPORTANT: The app_get_details endpoint from the legacy Deriv API is NOT available
 * via the new REST API. App details must be retrieved through the application_read
 * scope after connection, or configured manually by the user.
 *
 * SECURITY: This route performs server-side operations only.
 * - Token exchange happens server-side (never in the browser)
 * - PKCE verifier is validated from httpOnly cookies
 * - State parameter is validated for CSRF protection
 * - Access tokens are stored server-side only
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/applications?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/applications?error=missing_params', request.url)
      );
    }

    // Verify state parameter (CSRF protection)
    const storedState = request.cookies.get('deriv_oauth_state')?.value;
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/settings/applications?error=invalid_state', request.url)
      );
    }

    // Get PKCE code verifier from httpOnly cookie
    const codeVerifier = request.cookies.get('deriv_code_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/settings/applications?error=missing_verifier', request.url)
      );
    }

    // The customer's OWN Deriv app_id (the app that actually earns
    // markup) - set by /api/deriv/oauth/authorize before redirecting to
    // Deriv. This is NOT the same as DERIV TECH's own platform app_id
    // used as the OAuth client_id below.
    const targetAppId = request.cookies.get('deriv_target_app_id')?.value;
    if (!targetAppId) {
      return NextResponse.redirect(
        new URL('/settings/applications?error=missing_verifier', request.url)
      );
    }

    // Exchange code for access token (server-side only)
    const [clientId, redirectUri] = await Promise.all([getDerivClientId(), getDerivRedirectUri()]);
    const tokenData = await exchangeCodeForToken(code, codeVerifier, clientId, redirectUri);

    const visitorId = request.cookies.get(GUEST_COOKIE)?.value || null;
    if (!isGuestId(visitorId)) {
      return NextResponse.redirect(new URL('/settings/deriv-integration?error=missing_guest', request.url));
    }

    // NOTE: The legacy Deriv API app_get_details endpoint is not available via the new REST API.
    // App name and details must be configured manually or retrieved after connection
    // using the application_read scope through the Deriv dashboard.
    const appName = 'Deriv Application';
    const appStatus = 'active';

    // Store the integration (upsert to handle reconnections)
    try {
      await sql`
        INSERT INTO guest_deriv_connections (
          visitor_id, deriv_app_id, access_token, refresh_token,
          token_expires_at, connection_status
        )
        VALUES (
          ${visitorId}, ${targetAppId},
          ${encrypt(tokenData.access_token)},
          ${tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null},
          ${tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null},
          'connected'
        )
        ON CONFLICT (visitor_id)
        DO UPDATE SET
          deriv_app_id = EXCLUDED.deriv_app_id,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          connection_status = 'connected',
          updated_at = NOW()
      `;
    } catch {
      // Sanitize error for logging - do not expose sensitive details
      throw new Error('Failed to store integration');
    }

    // Clear OAuth cookies and redirect
    const response = NextResponse.redirect(
      new URL('/settings/deriv-integration?success=connected', request.url)
    );
    response.cookies.delete('deriv_code_verifier');
    response.cookies.delete('deriv_oauth_state');
    response.cookies.delete('deriv_target_app_id');

    return response;
  } catch (error) {
    // Do not log sensitive error details
    return NextResponse.redirect(
      new URL('/settings/applications?error=callback_failed', new URL(request.url).origin)
    );
  }
}
