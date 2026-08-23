'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { Activity, RefreshCw } from 'lucide-react';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('deriv_integrations')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false });

      setIntegrations(data || []);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-surface-400 text-sm mt-1">All Deriv integrations across organizations</p>
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left p-4 text-sm font-medium text-surface-400">Organization</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">App ID</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">App Name</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Markup</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((int) => (
              <tr key={int.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="p-4 text-sm text-white">{int.organizations?.name || '-'}</td>
                <td className="p-4 text-sm text-surface-300 font-mono">{int.deriv_app_id}</td>
                <td className="p-4 text-sm text-surface-300">{int.app_name || '-'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    int.connection_status === 'connected' ? 'bg-success-500/10 text-success-500' :
                    int.connection_status === 'error' ? 'bg-danger-500/10 text-danger-500' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {int.connection_status}
                  </span>
                </td>
                <td className="p-4 text-sm text-surface-300 text-right">{Number(int.markup_percentage).toFixed(2)}%</td>
                <td className="p-4 text-sm text-surface-300 text-right">
                  {int.last_successful_sync_at ? formatRelativeTime(int.last_successful_sync_at) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
