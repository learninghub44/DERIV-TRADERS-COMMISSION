import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildDerivAuthUrl, generatePKCE, generateCodeChallenge } from '@/services/deriv/auth';
import crypto from 'crypto';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return response;
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
