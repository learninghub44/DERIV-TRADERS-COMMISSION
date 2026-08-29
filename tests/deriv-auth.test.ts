import { describe, it, expect, afterEach } from 'vitest';
import {
  generatePKCE,
  generateCodeChallenge,
  buildDerivAuthUrl,
  getDerivClientId,
  getDerivLegacyAppId,
} from '@/services/deriv/auth';

describe('generatePKCE', () => {
  it('returns a URL-safe base64 string with no padding', () => {
    const verifier = generatePKCE();
    expect(verifier).not.toMatch(/[+/=]/);
    expect(verifier.length).toBeGreaterThan(0);
  });

  it('returns a different value each call', () => {
    expect(generatePKCE()).not.toBe(generatePKCE());
  });
});

describe('generateCodeChallenge', () => {
  it('is deterministic for the same verifier', async () => {
    const verifier = 'fixed-test-verifier';
    const a = await generateCodeChallenge(verifier);
    const b = await generateCodeChallenge(verifier);
    expect(a).toBe(b);
  });

  it('is URL-safe base64 with no padding', async () => {
    const challenge = await generateCodeChallenge('some-verifier-value');
    expect(challenge).not.toMatch(/[+/=]/);
  });
});

describe('buildDerivAuthUrl', () => {
  it('includes all required OAuth params', () => {
    const url = buildDerivAuthUrl(
      { clientId: 'app123', redirectUri: 'https://example.com/callback', scope: ['application_read'] },
      'challenge-value',
      'state-value'
    );
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://auth.deriv.com/oauth2/auth');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe('app123');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(parsed.searchParams.get('scope')).toBe('application_read');
    expect(parsed.searchParams.get('state')).toBe('state-value');
    expect(parsed.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('omits app_id when no legacyAppId is configured', () => {
    const url = buildDerivAuthUrl(
      { clientId: 'app123', redirectUri: 'https://example.com/callback', scope: ['application_read'] },
      'challenge-value',
      'state-value'
    );
    expect(new URL(url).searchParams.has('app_id')).toBe(false);
  });

  it('appends app_id when legacyAppId is configured, alongside client_id', () => {
    const url = buildDerivAuthUrl(
      {
        clientId: 'app123',
        redirectUri: 'https://example.com/callback',
        scope: ['application_read'],
        legacyAppId: 'legacy456',
      },
      'challenge-value',
      'state-value'
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe('app123');
    expect(parsed.searchParams.get('app_id')).toBe('legacy456');
  });
});

describe('getDerivClientId', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers NEXT_PUBLIC_DERIV_CLIENT_ID when set', () => {
    process.env.NEXT_PUBLIC_DERIV_CLIENT_ID = 'new-style-id';
    process.env.NEXT_PUBLIC_DERIV_APP_ID = 'old-style-id';
    expect(getDerivClientId()).toBe('new-style-id');
  });

  it('falls back to NEXT_PUBLIC_DERIV_APP_ID for older deployments', () => {
    delete process.env.NEXT_PUBLIC_DERIV_CLIENT_ID;
    process.env.NEXT_PUBLIC_DERIV_APP_ID = 'old-style-id';
    expect(getDerivClientId()).toBe('old-style-id');
  });

  it('throws when neither is set', () => {
    delete process.env.NEXT_PUBLIC_DERIV_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_DERIV_APP_ID;
    expect(() => getDerivClientId()).toThrow();
  });
});

describe('getDerivLegacyAppId', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns undefined when DERIV_LEGACY_APP_ID is unset', () => {
    delete process.env.DERIV_LEGACY_APP_ID;
    expect(getDerivLegacyAppId()).toBeUndefined();
  });

  it('returns undefined (not empty string) when set to an empty string', () => {
    process.env.DERIV_LEGACY_APP_ID = '';
    expect(getDerivLegacyAppId()).toBeUndefined();
  });

  it('returns the configured value when set', () => {
    process.env.DERIV_LEGACY_APP_ID = 'legacy789';
    expect(getDerivLegacyAppId()).toBe('legacy789');
  });
});
