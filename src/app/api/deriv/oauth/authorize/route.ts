import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildDerivAuthUrl, generatePKCE, generateCodeChallenge } from '@/services/deriv/auth';
import crypto from 'crypto';

/**
 * IMPORTANT: `client_id` here is DERIV TECH's own platform-wide Deriv
 * app (registered once, used as the "Login with Deriv" OAuth client for
 * every customer). That is a SEPARATE thing from the customer's own
 * Deriv application - the one they built, that actually earns markup.
 *
 * The OAuth login only proves "this Deriv account holder approved
 * DERIV TECH." It does not tell us which of the customer's own
 * registered app_ids they want tracked - markup-statistics is scoped
 * per app_id, and the customer must supply that themselves (they
 * already have it from registering their app at developers.deriv.com).
 * We carry it through the flow in a cookie so the callback route can
 * store it against this integration instead of DERIV TECH's own app_id.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetAppId = typeof body.appId === 'string' ? body.appId.trim() : '';

    if (!targetAppId || targetAppId.length > 64 || !/^\d+$/.test(targetAppId)) {
      return NextResponse.json(
        { error: 'Enter the App ID of your own Deriv application (from developers.deriv.com) before connecting.' },
        { status: 400 }
      );
    }

    // Generate PKCE values
    const codeVerifier = generatePKCE();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(32).toString('hex');

    const authorizationUrl = buildDerivAuthUrl(
      {
        clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID!,
        redirectUri: process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI!,
        scope: ['application_read'],
      },
      codeChallenge,
      state
    );

    // NOTE: both keys are returned - the applications page reads `url`
    // while the deriv-integration settings page reads `authorizationUrl`.
    const response = NextResponse.json({ url: authorizationUrl, authorizationUrl });

    // Store PKCE and state in httpOnly cookies
    response.cookies.set('deriv_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    });

    response.cookies.set('deriv_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    response.cookies.set('deriv_target_app_id', targetAppId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
