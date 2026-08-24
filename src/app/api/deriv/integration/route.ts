import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * DERIV TECH - Current Integration Status
 *
 * Returns the caller's org's Deriv integration, if any. Never returns
 * access_token/refresh_token - the client only needs status fields.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json({ integration: null });
    }

    const { data: integration } = await supabase
      .from('deriv_integrations')
      .select(
        'id, deriv_app_id, app_name, connection_status, auth_method, last_sync_at, last_successful_sync_at, sync_error, markup_percentage, created_at'
      )
      .eq('organization_id', member.organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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
