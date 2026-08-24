-- ============================================================
-- DERIV TECH - Support manual API token connections
-- ============================================================
-- Adds a way for a customer to connect by pasting a Deriv API
-- token directly, as an alternative to the OAuth 2.0 + PKCE flow.
-- access_token / refresh_token now always hold application-level
-- AES-256-GCM ciphertext (see src/lib/encryption.ts), not plaintext.
-- ============================================================

ALTER TABLE deriv_integrations
  ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'oauth'
    CHECK (auth_method IN ('oauth', 'api_token'));

COMMENT ON COLUMN deriv_integrations.access_token IS
  'AES-256-GCM ciphertext (application-level encryption, see src/lib/encryption.ts). Never plaintext.';
COMMENT ON COLUMN deriv_integrations.refresh_token IS
  'AES-256-GCM ciphertext (application-level encryption, see src/lib/encryption.ts). Null for auth_method = api_token.';
