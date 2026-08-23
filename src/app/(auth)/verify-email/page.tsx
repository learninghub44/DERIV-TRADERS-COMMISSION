'use client';

import Link from 'next/link';
import { Mail, Zap } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">DERIV TECH</span>
        </Link>
        <div className="w-16 h-16 rounded-full bg-brand-600/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-brand-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-surface-400 mb-6">
          We sent a verification link to your email address. Click the link to verify your account.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-lg font-medium text-white transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
