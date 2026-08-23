'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { Settings, RefreshCw, Plus, Trash2, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ApplicationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!member) return;

      const { data } = await supabase
        .from('deriv_integrations')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: false });

      setIntegrations(data || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Redirect to OAuth authorization
      const response = await fetch('/api/deriv/oauth/authorize', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to initiate connection:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;

    try {
      await fetch('/api/deriv/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      await fetch('/api/deriv/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      });
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  };

  const statusColors: Record<string, string> = {
    connected: 'bg-success-500/10 text-success-500 border-success-500/20',
    connecting: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
    disconnected: 'bg-surface-800 text-surface-400 border-surface-700',
    error: 'bg-danger-500/10 text-danger-500 border-danger-500/20',
    syncing: 'bg-brand-600/10 text-brand-500 border-brand-600/20',
  };

  const statusIcons: Record<string, any> = {
    connected: CheckCircle2,
    connecting: Loader2,
    disconnected: XCircle,
    error: XCircle,
    syncing: RefreshCw,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deriv Applications</h1>
          <p className="text-surface-400 text-sm mt-1">Connect and manage your Deriv OAuth applications</p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Connect Deriv
        </button>
      </div>

      {/* Connection Info */}
      <div className="p-4 rounded-xl bg-brand-600/5 border border-brand-600/20">
        <h3 className="text-sm font-medium text-brand-400 mb-2">How Deriv Connection Works</h3>
        <p className="text-xs text-surface-400">
          We use OAuth 2.0 with PKCE to securely connect your Deriv application. You will be redirected to Deriv 
          to authorize access. We never see or store your Deriv password. The connection requires the{' '}
          <code className="px-1 py-0.5 bg-surface-800 rounded text-surface-300">application_read</code> scope 
          to retrieve your application data and markup statistics.
        </p>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="p-12 rounded-xl bg-surface-900 border border-surface-800 text-center">
          <Settings className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No applications connected</h3>
          <p className="text-sm text-surface-400 mb-6 max-w-md mx-auto">
            Connect your Deriv OAuth application to start tracking markup, commissions, and trading activity.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Connect Deriv Application
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => {
            const StatusIcon = statusIcons[integration.connection_status] || XCircle;
            const isAnimating = integration.connection_status === 'syncing' || integration.connection_status === 'connecting';

            return (
              <div key={integration.id} className="p-6 rounded-xl bg-surface-900 border border-surface-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-600/10 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-brand-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{integration.app_name || 'Deriv Application'}</h3>
                      <p className="text-sm text-surface-400 mt-0.5">
                        App ID: <span className="font-mono text-surface-300">{integration.deriv_app_id}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[integration.connection_status]}`}>
                          <StatusIcon className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
                          {integration.connection_status}
                        </span>
                        {integration.last_successful_sync_at && (
                          <span className="text-xs text-surface-500">
                            Last sync: {formatRelativeTime(integration.last_successful_sync_at)}
                          </span>
                        )}
                      </div>
                      {integration.sync_error && (
                        <p className="text-xs text-danger-500 mt-2">{integration.sync_error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={integration.connection_status === 'syncing'}
                      className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 rounded-lg text-xs font-medium text-white transition-colors"
                    >
                      Sync Now
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="px-3 py-1.5 bg-danger-500/10 hover:bg-danger-500/20 rounded-lg text-xs font-medium text-danger-500 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Markup info */}
                <div className="mt-4 pt-4 border-t border-surface-800 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-surface-400">Markup</p>
                    <p className="text-sm font-medium text-white">{Number(integration.markup_percentage).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">Scopes</p>
                    <p className="text-sm text-surface-300">{integration.scope?.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">Status</p>
                    <p className="text-sm text-surface-300">{integration.app_status || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
