'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PieChart, RefreshCw, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [stats, setStats] = useState({
    markupTrend: [] as { date: string; amount: number }[],
    commissionTrend: [] as { date: string; amount: number }[],
    topClients: [] as any[],
    dailyEarnings: [] as { date: string; markup: number; commissions: number }[],
  });
  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?dateRange=${encodeURIComponent(dateRange)}`);
      if (!res.ok) return;
      const { markupData, commissionData, topClients } = await res.json();

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Build daily data
      const dailyMap: Record<string, { markup: number; commissions: number }> = {};
      const days = parseInt(dateRange);
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = { markup: 0, commissions: 0 };
      }

      (markupData || []).forEach((r: any) => {
        if (dailyMap[r.record_date]) {
          dailyMap[r.record_date].markup += Number(r.total_markup);
        }
      });

      (commissionData || []).forEach((r: any) => {
        if (dailyMap[r.record_date]) {
          dailyMap[r.record_date].commissions += Number(r.amount);
        }
      });

      const dailyEarnings = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }));

      setStats({
        markupTrend: dailyEarnings.map(d => ({ date: d.date, amount: d.markup })),
        commissionTrend: dailyEarnings.map(d => ({ date: d.date, amount: d.commissions })),
        topClients: topClients || [],
        dailyEarnings,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxMarkup = Math.max(...stats.dailyEarnings.map(d => d.markup + d.commissions), 1);

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
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-surface-400 text-sm mt-1">Performance insights and trends</p>
        </div>
        <div className="flex gap-1 p-1 bg-surface-900 rounded-lg border border-surface-800">
          {['7', '30', '90'].map((days) => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                dateRange === days ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">Earnings Over Time</h3>
        <div className="h-64 flex items-end gap-1">
          {stats.dailyEarnings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-surface-400 text-sm">
              No data available for the selected period
            </div>
          ) : (
            stats.dailyEarnings.map((day) => {
              const total = day.markup + day.commissions;
              const height = maxMarkup > 0 ? (total / maxMarkup) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${formatCurrency(total)}`}>
                  <div
                    className="w-full bg-brand-600 rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-surface-500">{day.date.slice(5)}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-surface-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-brand-600" />
            Markup + Commissions
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="rounded-xl bg-surface-900 border border-surface-800">
          <div className="p-4 border-b border-surface-800">
            <h3 className="font-semibold text-white">Top Earning Clients</h3>
          </div>
          <div className="p-4">
            {stats.topClients.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">No client data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topClients.map((client, idx) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50">
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-500">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{client.external_client_id}</p>
                      <p className="text-xs text-surface-400">{client.total_contracts} contracts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(Number(client.generated_markup))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-surface-900 border border-surface-800">
          <div className="p-4 border-b border-surface-800">
            <h3 className="font-semibold text-white">Period Summary</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
              <span className="text-sm text-surface-400">Total Markup (period)</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(stats.dailyEarnings.reduce((s, d) => s + d.markup, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
              <span className="text-sm text-surface-400">Total Commissions (period)</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(stats.dailyEarnings.reduce((s, d) => s + d.commissions, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
              <span className="text-sm text-surface-400">Average Daily Earnings</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(
                  stats.dailyEarnings.length > 0
                    ? stats.dailyEarnings.reduce((s, d) => s + d.markup + d.commissions, 0) / stats.dailyEarnings.length
                    : 0
                )}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
              <span className="text-sm text-surface-400">Best Day</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(
                  Math.max(...stats.dailyEarnings.map(d => d.markup + d.commissions), 0)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
              <span className="text-sm text-surface-400">Tracked Clients</span>
              <span className="text-sm font-medium text-white">{stats.topClients.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
