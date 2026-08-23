'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { Building, RefreshCw, Save, Users, Shield } from 'lucide-react';

export default function OrganizationPage() {
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
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

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', member.organization_id)
        .single();

      setOrg(orgData);
      setName(orgData?.name || '');
      setWebsite(orgData?.website || '');

      const { data: membersData } = await supabase
        .from('organization_members')
        .select('*, profiles:user_id(email, full_name)')
        .eq('organization_id', member.organization_id);

      setMembers(membersData || []);
    } catch (error) {
      console.error('Failed to load organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!org) return;
      await supabase
        .from('organizations')
        .update({ name, website })
        .eq('id', org.id);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organization</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your organization settings</p>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-white">Organization Details</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="https://"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-400">Plan</label>
            <p className="font-medium text-white capitalize">{org?.subscription_plan}</p>
          </div>
          <div>
            <label className="block text-sm text-surface-400">Created</label>
            <p className="font-medium text-white">{formatDate(org?.created_at)}</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-white">Members ({members.length})</h2>
        </div>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50">
              <div>
                <p className="text-sm font-medium text-white">{member.profiles?.full_name || member.profiles?.email}</p>
                <p className="text-xs text-surface-400">{member.profiles?.email}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-surface-800 text-surface-300 capitalize">
                {member.role?.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
