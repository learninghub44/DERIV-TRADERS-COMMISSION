'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Users, RefreshCw, Search } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
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
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-surface-400 text-sm mt-1">Manage all users</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left p-4 text-sm font-medium text-surface-400">Name</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Email</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Role</th>
              <th className="text-left p-4 text-sm font-medium text-surface-400">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                <td className="p-4 text-sm text-white font-medium">{user.full_name || '-'}</td>
                <td className="p-4 text-sm text-surface-300">{user.email}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.role === 'super_admin' ? 'bg-danger-500/10 text-danger-500' :
                    user.role === 'org_owner' ? 'bg-brand-600/10 text-brand-500' :
                    'bg-surface-800 text-surface-400'
                  }`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 text-sm text-surface-300">{formatDate(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
