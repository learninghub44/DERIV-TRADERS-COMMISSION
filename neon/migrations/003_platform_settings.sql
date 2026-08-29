-- ============================================================
-- DERIV TECH - Platform settings (admin-editable configuration)
-- ============================================================
-- Lets the super_admin manage platform-wide config (Deriv OAuth
-- client_id/legacy app_id/redirect URI, Resend API key, email
-- sender, app URL) from the /admin/settings UI instead of only
-- via environment variables set at deploy time.
--
-- Secret values (currently just resend_api_key) are stored as
-- AES-256-GCM ciphertext via src/lib/encryption.ts, same as Deriv
-- credentials in deriv_integrations - never plaintext.
--
-- Environment variables remain the fallback: src/lib/settings.ts
-- checks this table first and falls back to process.env when a
-- key has no row (or an empty value), so existing deployments
-- keep working unchanged until an admin sets something here.
-- ============================================================

CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE platform_settings IS
  'Admin-editable platform configuration, managed via /admin/settings. Falls back to environment variables when a key is unset - see src/lib/settings.ts.';
COMMENT ON COLUMN platform_settings.value IS
  'Plaintext for non-secret keys. AES-256-GCM ciphertext (src/lib/encryption.ts) when is_secret = true.';
