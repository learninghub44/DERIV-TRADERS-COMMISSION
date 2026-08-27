'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Building, RefreshCw, Search } from 'lucide-react';

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizations');
      if (!res.ok) return;
      const { organizations: data } = await res.json();
      setOrganizations(data || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await fetch('/api/admin/organizations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, status: newStatus }),
    });
    await loadOrganizations();
  };

  const filtered = organizations.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
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
      <div>
        <h1 className="text-2xl font-bold text-white">Organizations</h1>
        <p className="text-surface-400 text-sm mt-1">Manage all organizations</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left p-4 text-sm font-medium text-surface-400">Name</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Slug</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Plan</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Status</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Created</th>
              <th className="text-right p-4 text-sm font-medium text-surface-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((org) => (
              <tr key={org.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="p-4 text-sm text-white font-medium">{org.name}</td>
                <td className="p-4 text-sm text-surface-300 font-mono">{org.slug}</td>
                <td className="p-4 text-sm text-surface-300 capitalize">{org.subscription_plan}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    org.status === 'active' ? 'bg-success-500/10 text-success-500' :
                    org.status === 'suspended' ? 'bg-danger-500/10 text-danger-500' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {org.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-surface-300">{formatDate(org.created_at)}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleStatus(org.id, org.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      org.status === 'active'
                        ? 'bg-danger-500/10 text-danger-500 hover:bg-danger-500/20'
                        : 'bg-success-500/10 text-success-500 hover:bg-success-500/20'
                    }`}
                  >
                    {org.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
