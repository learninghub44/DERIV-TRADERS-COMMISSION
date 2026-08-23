'use client';

import { Settings } from 'lucide-react';

/**
 * DERIV TECH - Admin System Settings
 *
 * Displays system configuration status.
 * No sensitive values are displayed.
 */

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Platform configuration</p>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">Environment Configuration</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Supabase URL</span>
            <span className="text-sm text-surface-300 font-mono">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Supabase Anon Key</span>
            <span className="text-sm text-surface-300 font-mono">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Deriv App ID</span>
            <span className="text-sm text-surface-300 font-mono">
              {process.env.NEXT_PUBLIC_DERIV_APP_ID ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Service Role Key</span>
            <span className="text-sm text-surface-300 font-mono">
              {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured (server-side only)' : 'Not configured'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">Security Notes</h3>
        <div className="space-y-2 text-sm text-surface-400">
          <p>Access tokens from Deriv are stored server-side only and are never exposed to the browser.</p>
          <p>Row Level Security (RLS) enforces tenant isolation at the database level.</p>
          <p>All Deriv API calls are made server-side. No direct browser-to-Deriv requests.</p>
          <p>OAuth 2.0 with PKCE is used for secure Deriv authentication.</p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">About</h3>
        <div className="space-y-2 text-sm text-surface-400">
          <p><strong className="text-white">DERIV TECH</strong> v1.0.0</p>
          <p>Independent analytics platform for Deriv API application operators.</p>
          <p>Not affiliated with or endorsed by Deriv.</p>
          <p className="text-xs text-surface-500 mt-4">
            Deriv API documentation: https://developers.deriv.com/docs/
          </p>
        </div>
      </div>
    </div>
  );
}
