import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  // 64-char hex = 32 bytes, matches the "hex key" branch in getKey()
  process.env.ENCRYPTION_KEY = 'a'.repeat(64);
});

describe('encryption', () => {
  it('round-trips a plaintext value', async () => {
    const { encrypt, decrypt } = await import('@/lib/encryption');
    const original = 'super-secret-deriv-token-12345';
    const ciphertext = encrypt(original);
    expect(decrypt(ciphertext)).toBe(original);
  });

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const { encrypt } = await import('@/lib/encryption');
    const a = encrypt('same-value');
    const b = encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('stores as iv:authTag:ciphertext', async () => {
    const { encrypt } = await import('@/lib/encryption');
    const parts = encrypt('token').split(':');
    expect(parts).toHaveLength(3);
  });

  it('throws on tampered ciphertext instead of returning garbage', async () => {
    const { encrypt, decrypt } = await import('@/lib/encryption');
    const ciphertext = encrypt('token-value');
    const [iv, tag, data] = ciphertext.split(':');
    const tampered = [iv, tag, Buffer.from('tampered-data').toString('base64')].join(':');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws a clear error when ENCRYPTION_KEY is missing', async () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    // Re-import isn't needed - getKey() reads process.env at call time
    const { encrypt } = await import('@/lib/encryption');
    expect(() => encrypt('x')).toThrow('ENCRYPTION_KEY is not configured');
    process.env.ENCRYPTION_KEY = original;
  });

  it('masks a secret to only its last 4 characters', async () => {
    const { maskSecret } = await import('@/lib/encryption');
    expect(maskSecret('abcd1234efgh5678')).toBe('••••5678');
    expect(maskSecret('ab')).toBe('••••');
  });
});
