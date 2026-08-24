'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Link,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Info,
} from 'lucide-react';

interface DerivIntegration {
  id: string;
  derivAppId: string;
  appName: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' | 'syncing';
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  syncError: string | null;
  markupPercentage: string;
  createdAt: string;
}

/**
 * DERIV TECH - Customer Deriv Integration Settings
 *
 * This page allows customers to connect their own Deriv application
 * through the official OAuth 2.0 + PKCE flow.
 *
 * The customer should NEVER need to:
 * - Create a database
 * - Configure Cloudflare
 * - Edit environment variables
 * - Understand API configuration
 *
 * They simply click "Connect Deriv" and authorize through the official Deriv flow.
 */
export default function DerivIntegrationPage() {
  const searchParams = useSearchParams();
  const [integration, setIntegration] = useState<DerivIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenAppId, setTokenAppId] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [connectingToken, setConnectingToken] = useState(false);

  // Check for success/error from OAuth callback
  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'connected') {
      setSuccess('Your Deriv application has been successfully connected!');
      loadIntegration();
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_state: 'Security validation failed. Please try again.',
        missing_verifier: 'Security validation failed. Please try again.',
        callback_failed: 'Connection failed. Please try again.',
        no_organization: 'Please create an organization first.',
        access_denied: 'You denied access. Please try again if you want to connect.',
      };
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
    }
  }, [searchParams]);

  // Load existing integration
  useEffect(() => {
    loadIntegration();
  }, []);

  async function loadIntegration() {
    try {
      const response = await fetch('/api/deriv/integration');
      if (response.ok) {
        const data = await response.json();
        setIntegration(data.integration);
      }
    } catch (err) {
      console.error('Failed to load integration:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/deriv/oauth/authorize', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const { authorizationUrl } = await response.json();
      window.location.href = authorizationUrl;
    } catch (err) {
      setError('Failed to initiate connection. Please try again.');
      setConnecting(false);
    }
  }

  async function handleConnectWithToken(e: React.FormEvent) {
    e.preventDefault();
    setConnectingToken(true);
    setError(null);

    try {
      const response = await fetch('/api/deriv/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: tokenAppId, apiToken: tokenValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      setSuccess('Your Deriv application has been successfully connected!');
      setShowTokenForm(false);
      setTokenAppId('');
      setTokenValue('');
      loadIntegration();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
    } finally {
      setConnectingToken(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect? This will stop syncing your Deriv data.')) {
      return;
    }

    try {
      const response = await fetch('/api/deriv/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIntegration(null);
      setSuccess('Disconnected successfully.');
    } catch (err) {
      setError('Failed to disconnect. Please try again.');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/deriv/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      setSuccess('Data synchronized successfully.');
      loadIntegration();
    } catch (err) {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
      case 'syncing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Deriv Integration</h1>
        <p className="text-surface-400 text-sm mt-1">
          Connect your Deriv application to start viewing your markup, commissions, and analytics.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(integration?.connectionStatus || 'disconnected')}
            <div>
              <h3 className="font-semibold text-white">
                {integration ? integration.appName || 'Deriv Application' : 'Not Connected'}
              </h3>
              <p className="text-sm text-surface-400">
                {integration
                  ? `Status: ${getStatusLabel(integration.connectionStatus)}`
                  : 'Connect your Deriv application to get started'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!integration ? (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                  {connecting ? 'Connecting...' : 'Connect Deriv'}
                </button>
                <button
                  onClick={() => setShowTokenForm((v) => !v)}
                  className="text-xs text-surface-400 hover:text-white transition-colors"
                >
                  {showTokenForm ? 'Cancel' : 'Have an API token instead?'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSync}
                  disabled={syncing || integration.connectionStatus === 'syncing'}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg font-medium transition-colors"
                >
                  <Unlink className="w-4 h-4" />
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Integration Details */}
        {integration && (
          <div className="mt-6 pt-6 border-t border-surface-800">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-surface-400">Application ID</dt>
                <dd className="text-sm text-white font-mono">{integration.derivAppId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-surface-400">Last Sync</dt>
                <dd className="text-sm text-white">
                  {integration.lastSuccessfulSyncAt
                    ? new Date(integration.lastSuccessfulSyncAt).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-surface-400">Markup Percentage</dt>
                <dd className="text-sm text-white">{integration.markupPercentage}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-surface-400">Connected Since</dt>
                <dd className="text-sm text-white">
                  {new Date(integration.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Manual API Token Form */}
        {!integration && showTokenForm && (
          <form
            onSubmit={handleConnectWithToken}
            className="mt-6 pt-6 border-t border-surface-800 space-y-4"
          >
            <div>
              <label htmlFor="tokenAppId" className="block text-sm font-medium text-white mb-1">
                Deriv App ID
              </label>
              <input
                id="tokenAppId"
                type="text"
                required
                value={tokenAppId}
                onChange={(e) => setTokenAppId(e.target.value)}
                placeholder="12345"
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="tokenValue" className="block text-sm font-medium text-white mb-1">
                Deriv API Token
              </label>
              <input
                id="tokenValue"
                type="password"
                required
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                placeholder="Paste your API token"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-surface-500 mt-1">
                Generate one at Deriv &gt; Settings &gt; API token with the{' '}
                <code className="px-1 py-0.5 bg-surface-800 rounded">application_read</code> scope.
                We verify it works before saving, then encrypt it - it's never shown again after this.
              </p>
            </div>
            <button
              type="submit"
              disabled={connectingToken}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {connectingToken && <Loader2 className="w-4 h-4 animate-spin" />}
              {connectingToken ? 'Verifying...' : 'Connect with Token'}
            </button>
          </form>
        )}

        {/* Sync Error */}
        {integration?.syncError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{integration.syncError}</p>
          </div>
        )}
      </div>

      {/* Information Card */}
      <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-semibold text-white">How it works</h3>
            <ol className="text-sm text-surface-400 space-y-2 list-decimal list-inside">
              <li>Click &quot;Connect Deriv&quot; to start the authorization process.</li>
              <li>You&apos;ll be redirected to Deriv&apos;s official website to log in.</li>
              <li>Authorize DERIV TECH to access your application data.</li>
              <li>You&apos;ll be redirected back with a successful connection.</li>
              <li>Your data will start syncing automatically.</li>
            </ol>

            <div className="pt-3 border-t border-surface-800">
              <h4 className="font-medium text-white mb-2">What we access:</h4>
              <ul className="text-sm text-surface-400 space-y-1">
                <li>• Markup statistics for your applications</li>
                <li>• Trading activity and volume data</li>
                <li>• Application configuration (read-only)</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-surface-800">
              <p className="text-xs text-surface-500">
                We use the official Deriv OAuth 2.0 flow. Your credentials are encrypted and stored securely.
                We never store your Deriv password.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Link */}
      <div className="text-center">
        <a
          href="https://deriv.com/account/applications"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400"
        >
          Manage your Deriv applications
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
