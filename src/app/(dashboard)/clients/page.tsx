'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { Users, RefreshCw, Search } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
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

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('generated_markup', { ascending: false });

      setClients(data || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.external_client_id.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-surface-400 text-sm mt-1">Traders using your connected application</p>
        </div>
        <div className="text-sm text-surface-400">{clients.length} clients</div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left p-4 text-sm font-medium text-surface-400">Client ID</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Registered</th>
                <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Contracts</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Volume</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Markup</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Commission</th>
                <th className="text-right p-4 text-sm font-medium text-surface-400">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-surface-400">
                    {search ? 'No clients match your search.' : 'No client data yet. Sync your Deriv application to see clients.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                    <td className="p-4 text-sm text-white font-mono">{client.external_client_id}</td>
                    <td className="p-4 text-sm text-surface-300">
                      {client.registration_date ? formatDate(client.registration_date) : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        client.status === 'active' ? 'bg-success-500/10 text-success-500' : 'bg-surface-800 text-surface-400'
                      }`}>
                        {client.status || 'unknown'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatNumber(client.total_contracts)}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(Number(client.total_volume))}</td>
                    <td className="p-4 text-sm text-white text-right font-medium">{formatCurrency(Number(client.generated_markup))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">{formatCurrency(Number(client.generated_commission))}</td>
                    <td className="p-4 text-sm text-surface-300 text-right">
                      {client.last_activity_at ? formatDate(client.last_activity_at) : '-'}
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
