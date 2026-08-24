import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const appId = typeof body.appId === 'string' ? body.appId.trim() : '';
    const apiToken = typeof body.apiToken === 'string' ? body.apiToken.trim() : '';

    if (!appId || appId.length > 64) {
      return NextResponse.json({ error: 'A valid Deriv App ID is required' }, { status: 400 });
    }
    if (!apiToken || apiToken.length < 8 || apiToken.length > 512) {
      return NextResponse.json({ error: 'A valid Deriv API token is required' }, { status: 400 });
    }

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

    const { error: insertError } = await supabase
      .from('deriv_integrations')
      .upsert({
        organization_id: member.organization_id,
        deriv_app_id: appId,
        app_name: 'Deriv Application (API Token)',
        app_status: 'active',
        auth_method: 'api_token',
        access_token: encrypt(apiToken),
        refresh_token: null,
        token_expires_at: null,
        scope: ['application_read'],
        connection_status: 'connected',
        markup_percentage: 0,
      }, {
        onConflict: 'organization_id,deriv_app_id',
      });

    if (insertError) {
      throw new Error('Failed to store integration');
    }

    await supabase.from('notifications').insert({
      user_id: user.id,
      organization_id: member.organization_id,
      title: 'Deriv Application Connected',
      message: 'Your Deriv application has been connected via API token. Markup data will sync automatically.',
      type: 'success',
    });

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      organization_id: member.organization_id,
      action: 'deriv_connected',
      resource_type: 'deriv_integration',
      details: { status: 'connected', auth_method: 'api_token' },
    });

    return NextResponse.json({ success: true, maskedToken: maskSecret(apiToken) });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
