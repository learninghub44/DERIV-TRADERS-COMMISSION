import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integrationId } = await request.json();

    if (!integrationId || typeof integrationId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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

    // Verify ownership and disconnect
    const { error } = await supabase
      .from('deriv_integrations')
      .update({
        connection_status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        sync_error: null,
      })
      .eq('id', integrationId)
      .eq('organization_id', member.organization_id);

    if (error) {
      throw new Error('Failed to disconnect');
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      organization_id: member.organization_id,
      title: 'Deriv Application Disconnected',
      message: 'Your Deriv application has been disconnected. Historical data is preserved.',
      type: 'info',
    });

    // Audit log (no sensitive data exposed)
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      organization_id: member.organization_id,
      action: 'deriv_disconnected',
      resource_type: 'deriv_integration',
      resource_id: integrationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
