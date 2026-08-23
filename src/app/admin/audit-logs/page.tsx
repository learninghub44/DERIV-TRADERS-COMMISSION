'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import { Shield, RefreshCw } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
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
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-surface-400 text-sm mt-1">System activity logs</p>
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left p-4 text-sm font-medium text-surface-400">Time</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Actor</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Action</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Resource</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-surface-400">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                  <td className="p-4 text-sm text-surface-300">{formatDateTime(log.created_at)}</td>
                  <td className="p-4 text-sm text-white">{log.actor_email || '-'}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-surface-300">
                    {log.resource_type ? `${log.resource_type}${log.resource_id ? ` (${log.resource_id.slice(0, 8)})` : ''}` : '-'}
                  </td>
                  <td className="p-4 text-sm text-surface-300 max-w-[200px] truncate">
                    {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
