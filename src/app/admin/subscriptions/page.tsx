'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { CreditCard, RefreshCw } from 'lucide-react';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false });

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
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
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-surface-400 text-sm mt-1">Manage subscription plans</p>
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left p-4 text-sm font-medium text-surface-400">Organization</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Max Apps</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Max Users</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Sync Freq</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Created</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="p-4 text-sm text-white">{sub.organizations?.name || '-'}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded capitalize ${
                    sub.plan === 'enterprise' ? 'bg-brand-600/10 text-brand-500' :
                    sub.plan === 'business' ? 'bg-warning-500/10 text-warning-500' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {sub.plan}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    sub.status === 'active' ? 'bg-success-500/10 text-success-500' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-surface-300 text-right">{sub.max_applications}</td>
                <td className="p-4 text-sm text-surface-300 text-right">{sub.max_users}</td>
                <td className="p-4 text-sm text-surface-300 text-right">{sub.sync_frequency_hours}h</td>
                <td className="p-4 text-sm text-surface-300">{formatDate(sub.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
