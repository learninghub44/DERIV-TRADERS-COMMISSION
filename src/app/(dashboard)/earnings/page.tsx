'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, RefreshCw, BarChart3, TrendingUp, Award } from 'lucide-react';

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    markup: 0,
    commissions: 0,
    total: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earnings');
      if (!res.ok) return;
      const { markupData, commissionData } = await res.json();

      const totalMarkup = (markupData || []).reduce((sum: number, r: any) => sum + Number(r.total_markup), 0);
      const totalCommissions = (commissionData || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

      setEarnings({
        markup: totalMarkup,
        commissions: totalCommissions,
        total: totalMarkup + totalCommissions,
      });

      // Group by month
      const months: Record<string, { markup: number; commissions: number }> = {};
      (markupData || []).forEach((r: any) => {
        const month = r.record_date.substring(0, 7);
        if (!months[month]) months[month] = { markup: 0, commissions: 0 };
        months[month].markup += Number(r.total_markup);
      });
      (commissionData || []).forEach((r: any) => {
        const month = r.record_date.substring(0, 7);
        if (!months[month]) months[month] = { markup: 0, commissions: 0 };
        months[month].commissions += Number(r.amount);
      });

      setMonthlyData(
        Object.entries(months)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, data]) => ({
            month,
            ...data,
            total: data.markup + data.commissions,
          }))
      );
    } catch (error) {
      console.error('Failed to load earnings data:', error);
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
        <h1 className="text-2xl font-bold text-white">Total Earnings</h1>
        <p className="text-surface-400 text-sm mt-1">Unified view of all verified earnings</p>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-600/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Deriv Markup</p>
              <p className="text-xs text-surface-500">Source: Deriv</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(earnings.markup)}</p>
        </div>

        <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-surface-400">Partner Commissions</p>
              <p className="text-xs text-surface-500">Source: Deriv</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(earnings.commissions)}</p>
        </div>

        <div className="p-6 rounded-xl bg-brand-600/10 border border-brand-600/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-brand-400">Total Verified Earnings</p>
              <p className="text-xs text-brand-400/60">Combined</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(earnings.total)}</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="rounded-xl bg-surface-900 border border-surface-800">
        <div className="p-4 border-b border-surface-800">
          <h3 className="font-semibold text-white">Monthly Earnings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Month</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Markup</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Commissions</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-surface-400">
                    No earnings data yet. Connect your Deriv application to start tracking.
                  </td>
                </tr>
              ) : (
                monthlyData.map((month) => (
                  <tr key={month.month} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white font-medium">{month.month}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(month.markup)}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(month.commissions)}</td>
                    <td className="p-4 text-sm text-white text-right font-bold">{formatCurrency(month.total)}</td>
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
