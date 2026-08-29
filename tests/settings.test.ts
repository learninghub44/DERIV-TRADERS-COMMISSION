import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

const mockSql = vi.fn(async () => [] as any[]);
vi.mock('@/lib/db', () => ({
  sql: (...args: any[]) => mockSql(...args),
}));

beforeAll(() => {
  // 64-char hex = 32 bytes, matches the "hex key" branch in encryption.ts getKey()
  process.env.ENCRYPTION_KEY = 'b'.repeat(64);
});

afterEach(() => {
  mockSql.mockReset();
  mockSql.mockResolvedValue([]);
});

describe('getSetting', () => {
  it('returns null when neither the DB nor an env var has a value', async () => {
    const { getSetting } = await import('@/lib/settings');
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    expect(await getSetting('app_url')).toBeNull();
  });

  it('returns the env var value when no DB row exists', async () => {
    const { getSetting } = await import('@/lib/settings');
    process.env.NEXT_PUBLIC_APP_URL = 'https://from-env.example.com';
    expect(await getSetting('app_url')).toBe('https://from-env.example.com');
  });

  it('prefers a plaintext DB value over the env var for non-secret keys', async () => {
    const { getSetting } = await import('@/lib/settings');
    mockSql.mockResolvedValueOnce([{ value: 'https://from-db.example.com' }]);
    process.env.NEXT_PUBLIC_APP_URL = 'https://from-env.example.com';
    expect(await getSetting('app_url')).toBe('https://from-db.example.com');
  });

  it('decrypts a secret key stored in the DB', async () => {
    const { getSetting } = await import('@/lib/settings');
    const { encrypt } = await import('@/lib/encryption');
    const ciphertext = encrypt('re_actual_api_key');
    mockSql.mockResolvedValueOnce([{ value: ciphertext }]);
    expect(await getSetting('resend_api_key')).toBe('re_actual_api_key');
  });
});

describe('setSetting', () => {
  it('encrypts secret keys before storing, leaves non-secret keys plaintext', async () => {
    const { setSetting } = await import('@/lib/settings');

    await setSetting('resend_api_key', 're_super_secret', 'admin-user-id');
    const [, , secretValueArg] = mockSql.mock.calls[0];
    expect(secretValueArg).not.toBe('re_super_secret');
    expect(String(secretValueArg)).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

    mockSql.mockReset();
    mockSql.mockResolvedValue([]);

    await setSetting('app_url', 'https://plain.example.com', 'admin-user-id');
    const [, , plainValueArg] = mockSql.mock.calls[0];
    expect(plainValueArg).toBe('https://plain.example.com');
  });
});

describe('getAllSettingStatuses', () => {
  it('masks secret values and reports their source', async () => {
    const { getAllSettingStatuses } = await import('@/lib/settings');
    const { encrypt } = await import('@/lib/encryption');

    mockSql.mockResolvedValueOnce([
      { key: 'resend_api_key', value: encrypt('re_1234567890abcdef') },
      { key: 'deriv_client_id', value: 'db-client-id' },
    ]);

    const statuses = await getAllSettingStatuses();

    expect(statuses.resend_api_key.isSet).toBe(true);
    expect(statuses.resend_api_key.source).toBe('database');
    expect(statuses.resend_api_key.displayValue).toBe('••••cdef');
    expect(statuses.resend_api_key.displayValue).not.toContain('re_1234567890abcdef');

    expect(statuses.deriv_client_id.displayValue).toBe('db-client-id');
    expect(statuses.deriv_client_id.source).toBe('database');
  });

  it('reports unset keys as such when neither DB nor env has a value', async () => {
    const { getAllSettingStatuses } = await import('@/lib/settings');
    delete process.env.DERIV_LEGACY_APP_ID;
    mockSql.mockResolvedValueOnce([]);

    const statuses = await getAllSettingStatuses();
    expect(statuses.deriv_legacy_app_id.isSet).toBe(false);
    expect(statuses.deriv_legacy_app_id.source).toBe('unset');
  });
});
