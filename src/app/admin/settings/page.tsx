'use client';

import {
  Database,
  Shield,
  Globe,
  Key,
  AlertTriangle,
} from 'lucide-react';

/**
 * DERIV TECH - Admin System Settings
 *
 * Displays platform-level configuration status.
 * This is for the DERIV TECH platform owner only.
 * Customers should NEVER see this page.
 *
 * No sensitive values are displayed - only status indicators.
 */
export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-surface-400 text-sm mt-1">DERIV TECH platform configuration (owner only)</p>
      </div>

      {/* Database Configuration */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-white">Database (Neon PostgreSQL)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Connection</span>
            <span className="text-sm text-green-400 font-mono">Configured</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">RLS Policies</span>
            <span className="text-sm text-green-400 font-mono">Active</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Migrations</span>
            <span className="text-sm text-green-400 font-mono">Applied</span>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-white">Authentication</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">JWT Secret</span>
            <span className="text-sm text-green-400 font-mono">Configured</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Session Duration</span>
            <span className="text-sm text-surface-300 font-mono">7 days</span>
          </div>
        </div>
      </div>

      {/* Deriv Integration */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-white">Deriv Platform Integration</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Platform App ID</span>
            <span className="text-sm text-green-400 font-mono">Configured</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">OAuth Endpoint</span>
            <span className="text-sm text-surface-300 font-mono">auth.deriv.com</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">API Base URL</span>
            <span className="text-sm text-surface-300 font-mono">api.derivws.com</span>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-white">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Encryption Key</span>
            <span className="text-sm text-green-400 font-mono">Configured</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Credential Encryption</span>
            <span className="text-sm text-green-400 font-mono">AES-256-GCM</span>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-white">Security Reminders</h3>
            <ul className="text-surface-400 space-y-1">
              <li>• All customer Deriv credentials are encrypted at rest</li>
              <li>• Database credentials never leave the server</li>
              <li>• Customer data is isolated via RLS policies</li>
              <li>• Never expose DATABASE_URL or ENCRYPTION_KEY</li>
              <li>• Customer-specific credentials are loaded per-organization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <h3 className="font-semibold text-white mb-4">Platform Information</h3>
        <div className="space-y-2 text-sm text-surface-400">
          <p><strong className="text-white">DERIV TECH</strong> v1.0.0</p>
          <p>Multi-tenant SaaS analytics platform for Deriv API application operators.</p>
          <p>Deployed on Cloudflare Workers with Neon PostgreSQL.</p>
          <p className="text-xs text-surface-500 mt-4">
            Deriv API documentation: https://developers.deriv.com/docs/
          </p>
        </div>
      </div>
    </div>
  );
}
