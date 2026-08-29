import { sql } from './db';
import { encrypt, decrypt, maskSecret } from './encryption';

/**
 * DERIV TECH - Platform settings
 *
 * Admin-editable platform configuration (Deriv OAuth client_id/legacy
 * app_id/redirect URI, Resend API key, email sender, app URL), backed by
 * the `platform_settings` table (see neon/migrations/003_platform_settings.sql)
 * and managed from /admin/settings.
 *
 * Every getter here checks the database first and falls back to the
 * matching environment variable when no row exists (or its value is
 * empty), so a fresh deployment that hasn't touched /admin/settings yet
 * keeps working exactly as before - env vars are not being removed, just
 * given a database-backed override.
 *
 * SERVER-SIDE ONLY - do not import from a 'use client' component.
 */

export const PLATFORM_SETTING_KEYS = [
  'deriv_client_id',
  'deriv_legacy_app_id',
  'deriv_redirect_uri',
  'resend_api_key',
  'email_from',
  'app_url',
] as const;

export type PlatformSettingKey = (typeof PLATFORM_SETTING_KEYS)[number];

const SECRET_KEYS: readonly PlatformSettingKey[] = ['resend_api_key'];

function isSecretKey(key: PlatformSettingKey): boolean {
  return (SECRET_KEYS as readonly string[]).includes(key);
}

// Matching env var(s) to fall back to, in priority order, for each key.
const ENV_FALLBACKS: Record<PlatformSettingKey, string[]> = {
  deriv_client_id: ['NEXT_PUBLIC_DERIV_CLIENT_ID', 'NEXT_PUBLIC_DERIV_APP_ID'],
  deriv_legacy_app_id: ['DERIV_LEGACY_APP_ID'],
  deriv_redirect_uri: ['NEXT_PUBLIC_DERIV_REDIRECT_URI'],
  resend_api_key: ['RESEND_API_KEY'],
  email_from: ['EMAIL_FROM'],
  app_url: ['NEXT_PUBLIC_APP_URL', 'APP_URL'],
};

function envFallback(key: PlatformSettingKey): string | null {
  for (const name of ENV_FALLBACKS[key]) {
    const v = process.env[name];
    if (v) return v;
  }
  return null;
}

/**
 * Get one setting's effective value: database row if set, else the
 * environment variable fallback, else null.
 */
export async function getSetting(key: PlatformSettingKey): Promise<string | null> {
  const rows = await sql`SELECT value FROM platform_settings WHERE key = ${key}`;
  const raw: string | null = rows[0]?.value ?? null;

  if (raw) {
    return isSecretKey(key) ? decrypt(raw) : raw;
  }

  return envFallback(key);
}

/**
 * Create or update one setting. Secret keys are encrypted before storage.
 * Pass an empty string to clear an override and fall back to the env var.
 */
export async function setSetting(
  key: PlatformSettingKey,
  value: string,
  updatedBy: string
): Promise<void> {
  const stored = value && isSecretKey(key) ? encrypt(value) : value || null;

  await sql`
    INSERT INTO platform_settings (key, value, is_secret, updated_by, updated_at)
    VALUES (${key}, ${stored}, ${isSecretKey(key)}, ${updatedBy}, now())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
  `;
}

export interface SettingStatus {
  /** The current effective value, safe to show in a UI. Secrets are masked. */
  displayValue: string;
  /** Whether a value is set at all (DB override or env var). */
  isSet: boolean;
  /** Whether the current value comes from an admin-set DB override (vs. an env var default). */
  source: 'database' | 'environment' | 'unset';
}

/**
 * Get every setting's status for the admin UI. Secret values are always
 * masked (never returned in plaintext to the client) regardless of source.
 */
export async function getAllSettingStatuses(): Promise<Record<PlatformSettingKey, SettingStatus>> {
  const rows = await sql`SELECT key, value FROM platform_settings`;
  const dbValues = new Map<string, string>(rows.map((r: any) => [r.key, r.value]));

  const result = {} as Record<PlatformSettingKey, SettingStatus>;

  for (const key of PLATFORM_SETTING_KEYS) {
    const dbRaw = dbValues.get(key);

    if (dbRaw) {
      const plain = isSecretKey(key) ? decrypt(dbRaw) : dbRaw;
      result[key] = {
        displayValue: isSecretKey(key) ? maskSecret(plain) : plain,
        isSet: true,
        source: 'database',
      };
      continue;
    }

    const fromEnv = envFallback(key);
    if (fromEnv) {
      result[key] = {
        displayValue: isSecretKey(key) ? maskSecret(fromEnv) : fromEnv,
        isSet: true,
        source: 'environment',
      };
      continue;
    }

    result[key] = { displayValue: '', isSet: false, source: 'unset' };
  }

  return result;
}
