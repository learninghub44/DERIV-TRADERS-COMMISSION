import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { exchangeCodeForToken } from '@/services/deriv/auth';
import { encrypt } from '@/lib/encryption';

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

    // Exchange code for access token (server-side only)
    const tokenData = await exchangeCodeForToken(
      code,
      codeVerifier,
      process.env.NEXT_PUBLIC_DERIV_APP_ID!,
      process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI!
    );

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.redirect(
        new URL('/settings/applications?error=no_organization', request.url)
      );
    }

    // NOTE: The legacy Deriv API app_get_details endpoint is not available via the new REST API.
    // App name and details must be configured manually or retrieved after connection
    // using the application_read scope through the Deriv dashboard.
    const appName = 'Deriv Application';
    const appStatus = 'active';

    // Store the integration (upsert to handle reconnections)
    const { error: insertError } = await supabase
      .from('deriv_integrations')
      .upsert({
        organization_id: member.organization_id,
        deriv_app_id: process.env.NEXT_PUBLIC_DERIV_APP_ID!,
        app_name: appName,
        app_status: appStatus,
        auth_method: 'oauth',
        access_token: encrypt(tokenData.access_token),
        refresh_token: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        token_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        scope: ['application_read'],
        connection_status: 'connected',
        markup_percentage: 0,
      }, {
        onConflict: 'organization_id,deriv_app_id',
      });

    if (insertError) {
      // Sanitize error for logging - do not expose sensitive details
      throw new Error('Failed to store integration');
    }

    // Create success notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      organization_id: member.organization_id,
      title: 'Deriv Application Connected',
      message: 'Your Deriv application has been successfully connected. Markup data will sync automatically.',
      type: 'success',
    });

    // Audit log (no sensitive data)
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      organization_id: member.organization_id,
      action: 'deriv_connected',
      resource_type: 'deriv_integration',
      details: { status: 'connected' },
    });

    // Clear OAuth cookies and redirect
    const response = NextResponse.redirect(
      new URL('/settings/applications?success=connected', request.url)
    );
    response.cookies.delete('deriv_code_verifier');
    response.cookies.delete('deriv_oauth_state');

    return response;
  } catch (error) {
    // Do not log sensitive error details
    return NextResponse.redirect(
      new URL('/settings/applications?error=callback_failed', new URL(request.url).origin)
    );
  }
}
