import { describe, it, expect } from 'vitest';
import {
  generatePKCE,
  generateCodeChallenge,
  buildDerivAuthUrl,
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
});
