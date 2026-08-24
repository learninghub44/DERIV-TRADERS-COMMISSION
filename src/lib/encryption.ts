import crypto from 'crypto';

/**
 * DERIV TECH - Credential Encryption
 *
 * AES-256-GCM encryption for Deriv access tokens, refresh tokens, and
 * manually-entered API tokens stored in `deriv_integrations`.
 *
 * SERVER-SIDE ONLY. Never import this from a 'use client' component -
 * ENCRYPTION_KEY must never reach the browser bundle.
 *
 * Stored format: base64(iv) + ':' + base64(authTag) + ':' + base64(ciphertext)
 * A random IV is generated per encryption call, so encrypting the same
 * plaintext twice produces different ciphertext (expected for GCM).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV, recommended for GCM

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }
  // Accept a 64-char hex string (32 bytes) or any other string, which we
  // stretch to exactly 32 bytes via SHA-256 so key length can't cause
  // silent failures in production.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  const [ivB64, authTagB64, dataB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString('utf8');
}

/** For displaying a stored secret in the UI without ever sending the real value back to the browser. */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 4) return '••••';
  return `••••${secret.slice(-4)}`;
}
