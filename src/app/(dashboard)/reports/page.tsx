'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { FileText, RefreshCw, Download, Plus } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [type, setType] = useState('markup');
  const [format, setFormat] = useState('csv');
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) return;
      const { reports: data } = await res.json();
      setReports(data || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, format }),
      });
      if (!res.ok) return;

      await loadReports();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const exportData = async (report: any) => {
    let data: any[] = [];
    let headers: string[] = [];

    if (report.report_type === 'markup') {
      const res = await fetch('/api/reports?export=markup');
      const { data: records } = await res.json();
      data = records || [];
      headers = ['Date', 'Markup', 'Contracts', 'Volume', 'Currency', 'Source'];
    } else if (report.report_type === 'commission') {
      const res = await fetch('/api/reports?export=commission');
      const { data: records } = await res.json();
      data = records || [];
      headers = ['Date', 'Type', 'Amount', 'Currency', 'Status', 'Description'];
    } else if (report.report_type === 'earnings') {
      const res = await fetch('/api/reports?export=earnings');
      const { markupData, commissionData } = await res.json();
      headers = ['Date', 'Markup', 'Commissions', 'Total'];
      const dayMap: Record<string, { markup: number; commissions: number }> = {};
      (markupData || []).forEach((r: any) => {
        if (!dayMap[r.record_date]) dayMap[r.record_date] = { markup: 0, commissions: 0 };
        dayMap[r.record_date].markup += Number(r.total_markup);
      });
      (commissionData || []).forEach((r: any) => {
        if (!dayMap[r.record_date]) dayMap[r.record_date] = { markup: 0, commissions: 0 };
        dayMap[r.record_date].commissions += Number(r.amount);
      });
      data = Object.entries(dayMap).map(([date, d]) => ({
        record_date: date,
        total_markup: d.markup,
        amount: d.commissions,
        total: d.markup + d.commissions,
      }));
    } else if (report.report_type === 'clients') {
      const res = await fetch('/api/reports?export=clients');
      const { data: records } = await res.json();
      data = records || [];
      headers = ['Client ID', 'Registered', 'Status', 'Contracts', 'Volume', 'Markup', 'Commission'];
    } else if (report.report_type === 'trading') {
      const res = await fetch('/api/reports?export=trading');
      const { data: records } = await res.json();
      data = records || [];
      headers = ['Contract ID', 'Type', 'Underlying', 'Amount', 'Result', 'Payout', 'Markup', 'Time'];
    }

    if (data.length === 0) return;

    const csv = [headers, ...data.map(r => Object.values(r).map(v => String(v ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}-report-${new Date().toISOString().split('T')[0]}.csv`;
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
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-surface-400 text-sm mt-1">Generate and download reports</p>
      </div>

      {/* Generate Report */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">Generate New Report</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="markup">Markup Report</option>
              <option value="commission">Commission Report</option>
              <option value="earnings">Earnings Report</option>
              <option value="clients">Client Report</option>
              <option value="trading">Trading Activity Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="px-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF (coming soon)</option>
            </select>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-xl bg-surface-900 border border-surface-800">
        <div className="p-4 border-b border-surface-800">
          <h3 className="font-semibold text-white">Recent Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Type</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Format</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Date Range</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Created</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-surface-400">
                    No reports generated yet.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white capitalize">{report.report_type}</td>
                    <td className="p-4 text-sm text-surface-300 uppercase">{report.format}</td>
                    <td className="p-4 text-sm text-surface-300">
                      {report.date_from} to {report.date_to}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.status === 'completed' ? 'bg-success-500/10 text-success-500' :
                        report.status === 'generating' ? 'bg-warning-500/10 text-warning-500' :
                        'bg-surface-800 text-surface-400'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-surface-300">{formatDate(report.created_at)}</td>
                    <td className="p-4 text-right">
                      {report.status === 'completed' && (
                        <button
                          onClick={() => exportData(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 rounded-lg text-xs font-medium text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
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
