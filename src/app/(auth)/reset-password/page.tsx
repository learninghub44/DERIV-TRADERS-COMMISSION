'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Unable to send reset link.');
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-success-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-surface-400 mb-6">
            We sent a password reset link to <strong className="text-white">{email}</strong>
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-lg font-medium text-white transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DERIV TECH</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
          <p className="text-surface-400">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-surface-400 mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-brand-500 hover:text-brand-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
