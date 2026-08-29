'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /settings/applications was an earlier, now-broken version of this page
 * (it called /api/deriv/oauth/authorize with no appId, which the current
 * route rejects - markup-statistics is scoped per the customer's own
 * Deriv app_id, which must be supplied explicitly).
 *
 * /settings/deriv-integration is the current, working version. This
 * redirect exists only in case something still links here.
 */
export default function ApplicationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/deriv-integration');
  }, [router]);

  return null;
}
