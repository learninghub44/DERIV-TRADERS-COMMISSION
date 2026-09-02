-- Anonymous Deriv OAuth connections. No local user account is created.
CREATE TABLE guest_deriv_connections (
  visitor_id UUID PRIMARY KEY,
  deriv_app_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);