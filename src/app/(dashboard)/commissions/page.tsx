'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, RefreshCw, Download } from 'lucide-react';

export default function CommissionsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0,
    paid: 0,
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => {
    loadCommissionData();
  }, []);

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/commissions');
      if (!res.ok) return;
      const { records: data } = await res.json();

      setRecords(data || []);

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      setStats({
        total: (data || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        today: (data || []).filter((r: any) => r.record_date === today).reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        thisMonth: (data || []).filter((r: any) => r.record_date >= monthStart).reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        lastMonth: (data || []).filter((r: any) => r.record_date >= lastMonthStart && r.record_date <= lastMonthEnd).reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        pending: (data || []).filter((r: any) => r.status === 'pending').reduce((sum: number, r: any) => sum + Number(r.amount), 0),
        paid: (data || []).filter((r: any) => r.status === 'paid').reduce((sum: number, r: any) => sum + Number(r.amount), 0),
      });
    } catch (error) {
      console.error('Failed to load commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    if (filter !== 'all' && record.commission_type !== filter) return false;
    if (search && !record.description?.toLowerCase().includes(search.toLowerCase()) && 
        !record.external_reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Description', 'Reference'];
    const rows = filteredRecords.map(r => [
      r.record_date,
      r.commission_type,
      r.amount,
      r.currency,
      r.status,
      r.description || '',
      r.external_reference || '',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-2xl font-bold text-white">Commissions</h1>
          <p className="text-surface-400 text-sm mt-1">Track all commission earnings</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Total Commission</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.total)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Today</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.today)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">This Month</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.thisMonth)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Last Month</p>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.lastMonth)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Pending</p>
          <p className="text-lg font-bold text-warning-500">{formatCurrency(stats.pending)}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
          <p className="text-xs text-surface-400 mb-1">Paid</p>
          <p className="text-lg font-bold text-success-500">{formatCurrency(stats.paid)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 bg-surface-900 rounded-lg border border-surface-800">
          {['all', 'markup', 'partner', 'referral'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === type ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="px-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Date</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Type</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Amount</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Currency</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Description</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-surface-400">
                    No commission records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white">{formatDate(record.record_date)}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-300">
                        {record.commission_type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-white text-right font-medium">{formatCurrency(Number(record.amount))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{record.currency}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        record.status === 'paid' ? 'bg-success-500/10 text-success-500' :
                        record.status === 'pending' ? 'bg-warning-500/10 text-warning-500' :
                        'bg-surface-800 text-surface-400'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-surface-300 max-w-[200px] truncate">{record.description || '-'}</td>
                    <td className="p-4 text-sm text-surface-300 font-mono text-xs">{record.external_reference || '-'}</td>
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
