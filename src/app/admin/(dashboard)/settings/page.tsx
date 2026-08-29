'use client';

import { useEffect, useState } from 'react';
import { Database, Shield, Globe, Mail, Key, AlertTriangle, Loader2, Check } from 'lucide-react';

/**
 * DERIV TECH - Admin Platform Settings
 *
 * Deriv OAuth (client_id, legacy app_id, redirect URI) and email (Resend
 * API key, from address, app URL) are edited here and stored in the
 * platform_settings table (PUT /api/admin/settings) - once set, there is
 * nothing left to configure via Cloudflare/wrangler for these values.
 *
 * DATABASE_URL, AUTH_SECRET, and ENCRYPTION_KEY stay as environment-only
 * bootstrap secrets: the app needs them before it can even reach the
 * database that would otherwise store an override for them, so they
 * can't be moved into this settings table without a chicken-and-egg
 * problem. Their status below is read-only.
 *
 * This is for the DERIV TECH platform owner only. Customers never see
 * this page (enforced by middleware's super_admin check on /admin/*).
 */

type SettingKey =
  | 'deriv_client_id'
  | 'deriv_legacy_app_id'
  | 'deriv_redirect_uri'
  | 'resend_api_key'
  | 'email_from'
  | 'app_url';

interface SettingStatus {
  displayValue: string;
  isSet: boolean;
  source: 'database' | 'environment' | 'unset';
}

type Settings = Record<SettingKey, SettingStatus>;

function SourceBadge({ source }: { source: SettingStatus['source'] }) {
  if (source === 'database') {
    return <span className="text-xs text-green-400 font-mono">saved here</span>;
  }
  if (source === 'environment') {
    return <span className="text-xs text-yellow-400 font-mono">from environment</span>;
  }
  return <span className="text-xs text-surface-500 font-mono">not set</span>;
}

function SettingField({
  label,
  hint,
  status,
  value,
  onChange,
  isSecret,
  placeholder,
}: {
  label: string;
  hint?: string;
  status?: SettingStatus;
  value: string;
  onChange: (v: string) => void;
  isSecret?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-surface-300">{label}</label>
        {status && <SourceBadge source={status.source} />}
      </div>
      {hint && <p className="text-xs text-surface-500 mb-1.5">{hint}</p>}
      <input
        type={isSecret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={status?.isSet ? status.displayValue : placeholder}
        className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [derivClientId, setDerivClientId] = useState('');
  const [derivLegacyAppId, setDerivLegacyAppId] = useState('');
  const [derivRedirectUri, setDerivRedirectUri] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveDeriv = async () => {
    await save({
      deriv_client_id: derivClientId,
      deriv_legacy_app_id: derivLegacyAppId,
      deriv_redirect_uri: derivRedirectUri,
    });
    setDerivClientId('');
    setDerivLegacyAppId('');
    setDerivRedirectUri('');
  };

  const handleSaveEmail = async () => {
    await save({
      resend_api_key: resendApiKey,
      email_from: emailFrom,
      app_url: appUrl,
    });
    setResendApiKey('');
    setEmailFrom('');
    setAppUrl('');
  };

  const save = async (updates: Partial<Record<SettingKey, string>>) => {
    // Only send fields the admin actually typed something into - an empty
    // field means "leave this as-is", not "clear it".
    const toSend = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v && v.trim().length > 0)
    );
    if (Object.keys(toSend).length === 0) return;

    setSaving(true);
    setError('');
    setSaved(false);

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: toSend }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error || 'Unable to save settings.');
      setSaving(false);
      return;
    }

    setSettings(body.settings);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
          <p className="text-surface-400 text-sm mt-1">
            DERIV TECH platform configuration (owner only) — saved here, not in Cloudflare
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-400">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm">
          {error}
        </div>
      )}

      {/* Deriv OAuth */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-white">Deriv OAuth</h3>
        </div>
        <div className="space-y-4">
          <SettingField
            label="Client ID"
            hint="Your registered Deriv OAuth2 client_id (developers.deriv.com). Public value - no client secret needed, this flow uses PKCE."
            status={settings?.deriv_client_id}
            value={derivClientId}
            onChange={setDerivClientId}
            placeholder="e.g. 12345"
          />
          <SettingField
            label="Legacy App ID (optional)"
            hint="Only if you also maintain a separate app on the Legacy Deriv API - routes users still on the old platform correctly. Leave blank otherwise."
            status={settings?.deriv_legacy_app_id}
            value={derivLegacyAppId}
            onChange={setDerivLegacyAppId}
            placeholder="e.g. 6789 (optional)"
          />
          <SettingField
            label="Redirect URI"
            hint="Must exactly match the callback URL registered with Deriv."
            status={settings?.deriv_redirect_uri}
            value={derivRedirectUri}
            onChange={setDerivRedirectUri}
            placeholder="https://yourdomain.com/api/deriv/oauth/callback"
          />
          <button
            onClick={handleSaveDeriv}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save Deriv settings'}
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-white">Email (Resend)</h3>
        </div>
        <div className="space-y-4">
          <SettingField
            label="Resend API Key"
            hint="Used to send verification and password-reset emails."
            status={settings?.resend_api_key}
            value={resendApiKey}
            onChange={setResendApiKey}
            isSecret
            placeholder="re_..."
          />
          <SettingField
            label="From address"
            hint='e.g. "DERIV TECH <noreply@yourdomain.com>" - the domain must be verified in Resend.'
            status={settings?.email_from}
            value={emailFrom}
            onChange={setEmailFrom}
            placeholder="DERIV TECH <noreply@yourdomain.com>"
          />
          <SettingField
            label="App URL"
            hint="Your production URL - used to build links inside emails."
            status={settings?.app_url}
            value={appUrl}
            onChange={setAppUrl}
            placeholder="https://yourdomain.com"
          />
          <button
            onClick={handleSaveEmail}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save email settings'}
          </button>
        </div>
      </div>

      {/* Database Configuration (read-only) */}
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
            <span className="text-sm text-surface-400">Tenant Isolation</span>
            <span className="text-sm text-green-400 font-mono">App-layer (org membership checks)</span>
          </div>
        </div>
      </div>

      {/* Security (read-only) */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-white">Security</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Auth session signing</span>
            <span className="text-sm text-green-400 font-mono">Configured</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800/50">
            <span className="text-sm text-surface-400">Credential Encryption</span>
            <span className="text-sm text-green-400 font-mono">AES-256-GCM</span>
          </div>
        </div>
        <p className="text-xs text-surface-500 mt-3">
          Database connection, session-signing, and encryption keys are environment-only bootstrap
          secrets and aren't editable here - the app needs them before it can reach the database
          that would otherwise store an override.
        </p>
      </div>

      {/* Important Notes */}
      <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-white">Security Reminders</h3>
            <ul className="text-surface-400 space-y-1">
              <li>• All customer Deriv credentials are encrypted at rest</li>
              <li>• The Resend API key above is encrypted at rest and never shown in full once saved</li>
              <li>• Customer data is isolated via org-membership checks in every API route</li>
              <li>• Settings changes are recorded in the audit log (key names only, never values)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-surface-500" />
          <h3 className="font-semibold text-white">Platform Information</h3>
        </div>
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
