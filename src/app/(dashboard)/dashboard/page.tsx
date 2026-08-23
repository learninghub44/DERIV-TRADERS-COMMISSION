'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils';
import {
  DollarSign,
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

/**
 * DERIV TECH - Dashboard Page
 *
 * Displays overview metrics for the connected Deriv API business.
 * All numbers are calculated from actual database records sourced from Deriv.
 *
 * IMPORTANT: This application does NOT generate fake financial data.
 * If no Deriv integration is connected, appropriate empty states are shown.
 * All monetary values are calculated from records in the markup_records,
 * commission_records, clients, and trading_activity tables.
 */

interface DashboardData {
  totalEarnings: number;
  totalMarkup: number;
  totalCommissions: number;
  activeClients: number;
  totalContracts: number;
  todayMarkup: number;
  lastSyncAt: string | null;
  connectionStatus: string;
  recentActivity: any[];
  topClients: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
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

      const orgId = member.organization_id;

      // Get integrations
      const { data: integrations } = await supabase
        .from('deriv_integrations')
        .select('*')
        .eq('organization_id', orgId);

      const isConnected = integrations?.some(i => i.connection_status === 'connected') || false;
      const lastSync = integrations?.reduce((latest, i) => {
        if (!latest || (i.last_successful_sync_at && i.last_successful_sync_at > latest)) {
          return i.last_successful_sync_at;
        }
        return latest;
      }, null as string | null);

      // Get markup records - all monetary values are NUMERIC in the database
      const { data: markupRecords } = await supabase
        .from('markup_records')
        .select('total_markup, record_date')
        .eq('organization_id', orgId)
        .order('record_date', { ascending: false });

      // Calculate markup using precise addition
      const totalMarkup = (markupRecords || []).reduce(
        (sum, r) => sum + parseFloat(String(r.total_markup || 0)),
        0
      );

      // Get commission records
      const { data: commissionRecords } = await supabase
        .from('commission_records')
        .select('amount, record_date')
        .eq('organization_id', orgId)
        .order('record_date', { ascending: false });

      const totalCommissions = (commissionRecords || []).reduce(
        (sum, r) => sum + parseFloat(String(r.amount || 0)),
        0
      );

      // Get active client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Get recent trading activity
      const { data: recentActivity } = await supabase
        .from('trading_activity')
        .select('id, contract_type, external_contract_id, amount, result, contract_time')
        .eq('organization_id', orgId)
        .order('contract_time', { ascending: false })
        .limit(5);

      // Get top clients by markup generated
      const { data: topClients } = await supabase
        .from('clients')
        .select('id, external_client_id, total_contracts, generated_markup')
        .eq('organization_id', orgId)
        .order('generated_markup', { ascending: false })
        .limit(5);

      // Calculate today's markup from actual records
      const today = new Date().toISOString().split('T')[0];
      const todayMarkup = (markupRecords || [])
        .filter(r => r.record_date === today)
        .reduce((sum, r) => sum + parseFloat(String(r.total_markup || 0)), 0);

      setData({
        totalEarnings: totalMarkup + totalCommissions,
        totalMarkup,
        totalCommissions,
        activeClients: clientCount || 0,
        totalContracts: recentActivity?.length || 0,
        todayMarkup,
        lastSyncAt: lastSync,
        connectionStatus: isConnected ? 'connected' : 'disconnected',
        recentActivity: recentActivity || [],
        topClients: topClients || [],
      });
    } catch (error) {
      // Do not log sensitive error details
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/deriv/sync', { method: 'POST' });
      await loadDashboardData();
    } catch (error) {
      // Silent fail - user can retry
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Overview of your Deriv API business</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            data?.connectionStatus === 'connected'
              ? 'bg-success-500/10 text-success-500 border border-success-500/20'
              : 'bg-surface-800 text-surface-400 border border-surface-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              data?.connectionStatus === 'connected' ? 'bg-success-500' : 'bg-surface-500'
            }`} />
            {data?.connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || data?.connectionStatus !== 'connected'}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </div>
      </div>

      {/* Connection banner */}
      {data?.connectionStatus !== 'connected' && (
        <div className="p-4 rounded-xl bg-brand-600/10 border border-brand-600/20">
          <div className="flex items-center gap-3">
            <ExternalLink className="w-5 h-5 text-brand-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">No Deriv application connected</p>
              <p className="text-xs text-surface-400">
                Connect your Deriv OAuth application to start tracking markup, commissions, and trading activity.
              </p>
            </div>
            <a
              href="/settings/applications"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Connect Deriv
            </a>
          </div>
        </div>
      )}

      {/* Stats cards - all values calculated from actual database records */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Total Earnings</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(data?.totalEarnings || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success-500" />
            </div>
          </div>
          <p className="text-xs text-surface-500 mt-2">Markup + Commissions</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Markup</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(data?.totalMarkup || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <p className="text-xs text-surface-500 mt-2">Source: Deriv</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Commissions</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(data?.totalCommissions || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning-500" />
            </div>
          </div>
          <p className="text-xs text-surface-500 mt-2">Source: Deriv</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Active Clients</p>
              <p className="text-2xl font-bold text-white mt-1">{formatNumber(data?.activeClients || 0)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-xs text-surface-500 mt-2">Tracked traders</p>
        </div>
      </div>

      {/* Secondary info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-sm text-surface-400">Application Status</p>
              <p className="font-medium text-white">
                {data?.connectionStatus === 'connected' ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-sm text-surface-400">Last Sync</p>
              <p className="font-medium text-white">
                {data?.lastSyncAt ? formatRelativeTime(data.lastSyncAt) : 'Never'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-sm text-surface-400">Today&apos;s Markup</p>
              <p className="font-medium text-white">{formatCurrency(data?.todayMarkup || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-xl bg-surface-900 border border-surface-800">
          <div className="p-4 border-b border-surface-800">
            <h3 className="font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="p-4">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50">
                    <div>
                      <p className="text-sm font-medium text-white">{activity.contract_type}</p>
                      <p className="text-xs text-surface-400">{activity.external_contract_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(Number(activity.amount))}</p>
                      <p className={`text-xs ${activity.result === 'win' ? 'text-success-500' : activity.result === 'loss' ? 'text-danger-500' : 'text-surface-400'}`}>
                        {activity.result || 'pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="rounded-xl bg-surface-900 border border-surface-800">
          <div className="p-4 border-b border-surface-800">
            <h3 className="font-semibold text-white">Top Clients</h3>
          </div>
          <div className="p-4">
            {data?.topClients && data.topClients.length > 0 ? (
              <div className="space-y-3">
                {data.topClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50">
                    <div>
                      <p className="text-sm font-medium text-white">{client.external_client_id}</p>
                      <p className="text-xs text-surface-400">
                        {formatNumber(client.total_contracts)} contracts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(Number(client.generated_markup))}</p>
                      <p className="text-xs text-surface-400">markup</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 text-center py-8">No client data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
