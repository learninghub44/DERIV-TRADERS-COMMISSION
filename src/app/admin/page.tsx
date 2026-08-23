'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Shield, RefreshCw, Building, Users, Activity, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    connectedApplications: 0,
    totalMarkup: 0,
    totalCommissions: 0,
    activeUsers: 0,
    failedIntegrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'super_admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const [orgs, integrations, markupData, commissionData, users] = await Promise.all([
        supabase.from('organizations').select('id, status'),
        supabase.from('deriv_integrations').select('id, connection_status'),
        supabase.from('markup_records').select('total_markup'),
        supabase.from('commission_records').select('amount'),
        supabase.from('profiles').select('id'),
      ]);

      const orgList = orgs.data || [];
      const intList = integrations.data || [];

      setStats({
        totalOrganizations: orgList.length,
        activeOrganizations: orgList.filter(o => o.status === 'active').length,
        connectedApplications: intList.filter(i => i.connection_status === 'connected').length,
        totalMarkup: (markupData.data || []).reduce((sum, r) => sum + Number(r.total_markup), 0),
        totalCommissions: (commissionData.data || []).reduce((sum, r) => sum + Number(r.amount), 0),
        activeUsers: users.data?.length || 0,
        failedIntegrations: intList.filter(i => i.connection_status === 'error').length,
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
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

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-surface-400">You do not have admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-surface-400 text-sm mt-1">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
              <Building className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Organizations</p>
              <p className="text-xl font-bold text-white">{stats.totalOrganizations}</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-success-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Connected Apps</p>
              <p className="text-xl font-bold text-white">{stats.connectedApplications}</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Total Markup</p>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.totalMarkup)}</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Active Users</p>
              <p className="text-xl font-bold text-white">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/organizations" className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
          <Building className="w-8 h-8 text-brand-500 mb-3" />
          <h3 className="font-semibold text-white mb-1">Organizations</h3>
          <p className="text-sm text-surface-400">Manage all organizations</p>
        </Link>

        <Link href="/admin/users" className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
          <Users className="w-8 h-8 text-brand-500 mb-3" />
          <h3 className="font-semibold text-white mb-1">Users</h3>
          <p className="text-sm text-surface-400">Manage all users</p>
        </Link>

        <Link href="/admin/integrations" className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
          <Activity className="w-8 h-8 text-brand-500 mb-3" />
          <h3 className="font-semibold text-white mb-1">Integrations</h3>
          <p className="text-sm text-surface-400">View all Deriv integrations</p>
        </Link>

        <Link href="/admin/audit-logs" className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
          <Shield className="w-8 h-8 text-brand-500 mb-3" />
          <h3 className="font-semibold text-white mb-1">Audit Logs</h3>
          <p className="text-sm text-surface-400">View system audit logs</p>
        </Link>

        <Link href="/admin/subscriptions" className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
          <TrendingUp className="w-8 h-8 text-brand-500 mb-3" />
          <h3 className="font-semibold text-white mb-1">Subscriptions</h3>
          <p className="text-sm text-surface-400">Manage subscription plans</p>
        </Link>

        {stats.failedIntegrations > 0 && (
          <div className="p-6 rounded-xl bg-danger-500/5 border border-danger-500/20">
            <AlertTriangle className="w-8 h-8 text-danger-500 mb-3" />
            <h3 className="font-semibold text-white mb-1">Failed Integrations</h3>
            <p className="text-sm text-danger-500">{stats.failedIntegrations} integrations need attention</p>
          </div>
        )}
      </div>
    </div>
  );
}
