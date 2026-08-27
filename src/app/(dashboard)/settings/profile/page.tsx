'use client';

import { useEffect, useState } from 'react';
import { User, RefreshCw, Save } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const { user: data } = await res.json();

      setProfile(data);
      setFullName(data?.fullName || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName }),
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your account settings</p>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center">
            <User className="w-8 h-8 text-brand-500" />
          </div>
          <div>
            <p className="font-medium text-white">{profile?.email}</p>
            <p className="text-sm text-surface-400 capitalize">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Email</label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-400 cursor-not-allowed"
          />
          <p className="text-xs text-surface-500 mt-1">Email cannot be changed here</p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
