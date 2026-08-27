'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart3, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * DERIV TECH - Markup Page
 *
 * Displays markup earnings data sourced from Deriv's official API.
 *
 * IMPORTANT: Markup configuration CANNOT be modified through the Deriv API.
 * To change markup settings, users must visit the Deriv Application Manager directly.
 * This page correctly shows a "Manage in Deriv" link instead of fake edit controls.
 *
 * All monetary values are calculated from records in the markup_records table,
 * which are populated by the sync engine from Deriv's /applications/v1/markup-statistics endpoint.
 */

export default function MarkupPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markupPct, setMarkupPct] = useState<number>(0);
  const [stats, setStats] = useState({
    totalMarkup: 0,
    todayMarkup: 0,
    weekMarkup: 0,
    monthMarkup: 0,
    lastMonthMarkup: 0,
    contractCount: 0,
  });
  useEffect(() => {
    loadMarkupData();
  }, []);

  const loadMarkupData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/markup');
      if (!res.ok) return;
      const { markupPct, records: data } = await res.json();

      setMarkupPct(Number(markupPct || 0));
      setRecords(data || []);

      // Calculate stats from actual records
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      const allRecords = data || [];

      setStats({
        totalMarkup: allRecords.reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0),
        todayMarkup: allRecords.filter((r: any) => r.record_date === today).reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0),
        weekMarkup: allRecords.filter((r: any) => r.record_date >= weekAgo).reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0),
        monthMarkup: allRecords.filter((r: any) => r.record_date >= monthStart).reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0),
        lastMonthMarkup: allRecords.filter((r: any) => r.record_date >= lastMonthStart && r.record_date <= lastMonthEnd).reduce((sum: number, r: any) => sum + parseFloat(String(r.total_markup || 0)), 0),
        contractCount: allRecords.reduce((sum: number, r: any) => sum + parseInt(String(r.contract_count || 0), 10), 0),
      });
    } catch (error) {
      // Silent fail
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markup</h1>
          <p className="text-surface-400 text-sm mt-1">Track your Deriv API markup earnings</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-400">
          <span className="px-2 py-1 rounded bg-surface-800 border border-surface-700">Source: Deriv</span>
        </div>
      </div>

      {/* Stats - all values from actual Deriv data */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Total Markup</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.totalMarkup)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Today</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.todayMarkup)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Last 7 Days</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.weekMarkup)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">This Month</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.monthMarkup)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Last Month</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.lastMonthMarkup)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Contracts</p>
          <p className="text-lg font-bold text-white">{stats.contractCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Markup Settings - READ ONLY, cannot be modified via API */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="text-lg font-semibold text-white mb-4">Markup Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-surface-400 mb-1">Current Markup</p>
            <p className="text-2xl font-bold text-white">
              {markupPct > 0 ? `${markupPct}%` : '--'}
            </p>
            <p className="text-xs text-surface-500 mt-1">
              {markupPct > 0 ? 'From Deriv application settings' : 'Set in your Deriv application'}
            </p>
          </div>
          <div>
            <p className="text-sm text-surface-400 mb-1">Status</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success-500/10 text-success-500 border border-success-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
              Active
            </span>
          </div>
          <div>
            <p className="text-sm text-surface-400 mb-1">Manage Markup</p>
            {/* Markup CANNOT be modified through the Deriv API - must use Deriv dashboard */}
            <a
              href="https://deriv.com/account/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Manage in Deriv
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-surface-500 mt-1">
              Markup is configured in your Deriv application settings (0-3%)
            </p>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-xl bg-surface-900 border border-surface-800">
        <div className="p-4 border-b border-surface-800">
          <h3 className="font-semibold text-white">Markup Records</h3>
          <p className="text-xs text-surface-400 mt-1">Sourced from Deriv API markup statistics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Date</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Markup</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Contracts</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Source</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-surface-400">
                    No markup records yet. Connect your Deriv application and sync data.
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <tr key={idx} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white">{formatDate(record.record_date)}</td>
                    <td className="p-4 text-sm text-white text-right font-medium">{formatCurrency(Number(record.total_markup))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{Number(record.contract_count).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-400">Deriv</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
