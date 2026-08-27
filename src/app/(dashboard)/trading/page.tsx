'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Activity, RefreshCw, Search, Download } from 'lucide-react';

export default function TradingPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  useEffect(() => {
    loadTradingActivity();
  }, []);

  const loadTradingActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trading');
      if (!res.ok) return;
      const { activities: data } = await res.json();
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load trading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter(a => {
    if (resultFilter !== 'all' && a.result !== resultFilter) return false;
    if (search && !a.external_contract_id?.includes(search) && !a.contract_type?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Contract ID', 'Type', 'Underlying', 'Amount', 'Currency', 'Result', 'Payout', 'Markup', 'Time'];
    const rows = filtered.map(r => [
      r.external_contract_id,
      r.contract_type,
      r.underlying || '',
      r.amount,
      r.currency,
      r.result || '',
      r.payout || '',
      r.markup || '',
      r.contract_time || '',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          <h1 className="text-2xl font-bold text-white">Trading Activity</h1>
          <p className="text-surface-400 text-sm mt-1">Contract details and performance</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-surface-900 rounded-lg border border-surface-800">
          {['all', 'win', 'loss', 'pending', 'open'].map((type) => (
            <button
              key={type}
              onClick={() => setResultFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                resultFilter === type ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Contract ID</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Type</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Underlying</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Amount</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Payout</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Result</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Markup</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-surface-400">
                    No trading activity found.
                  </td>
                </tr>
              ) : (
                filtered.map((activity) => (
                  <tr key={activity.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white font-mono text-xs">{activity.external_contract_id}</td>
                    <td className="p-4 text-sm text-surface-300">{activity.contract_type}</td>
                    <td className="p-4 text-sm text-surface-300">{activity.underlying || '-'}</td>
                    <td className="p-4 text-sm text-white text-right">{formatCurrency(Number(activity.amount))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(Number(activity.payout || 0))}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        activity.result === 'win' ? 'bg-success-500/10 text-success-500' :
                        activity.result === 'loss' ? 'bg-danger-500/10 text-danger-500' :
                        'bg-surface-800 text-surface-400'
                      }`}>
                        {activity.result || 'pending'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(Number(activity.markup || 0))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">
                      {activity.contract_time ? formatDate(activity.contract_time) : '-'}
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
