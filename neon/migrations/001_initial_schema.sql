-- DERIV TECH Database Schema (Neon PostgreSQL)
-- Multi-tenant SaaS. Authorization is enforced in the application layer
-- (via JWT session + org-membership checks in API routes), not Postgres RLS,
-- since Neon has no auth.uid() / Supabase Auth integration.

-- DERIV TECH Database Schema
-- Multi-tenant SaaS with Row Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'org_owner', 'org_admin', 'staff')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token TEXT,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  logo_url TEXT,
  website TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  subscription_plan TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'business', 'enterprise')),
  max_applications INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('org_owner', 'org_admin', 'staff')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- DERIV INTEGRATIONS
-- ============================================================
CREATE TABLE deriv_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deriv_app_id TEXT NOT NULL,
  app_name TEXT,
  app_status TEXT DEFAULT 'unknown',
  access_token TEXT, -- SECURITY NOTE: Should be encrypted at rest in production (e.g., pgcrypto)
  refresh_token TEXT, -- SECURITY NOTE: Should be encrypted at rest in production (e.g., pgcrypto)
  token_expires_at TIMESTAMPTZ,
  scope TEXT[] DEFAULT '{}',
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'connecting', 'disconnected', 'error', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  markup_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, deriv_app_id)
);

-- ============================================================
-- DERIV APPLICATIONS (metadata from Deriv)
-- ============================================================
CREATE TABLE deriv_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_app_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  redirect_uri TEXT,
  verification_url TEXT,
  scopes TEXT[] DEFAULT '{}',
  markup_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, external_app_id)
);

-- ============================================================
-- MARKUP RECORDS
-- ============================================================
CREATE TABLE markup_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  application_id UUID REFERENCES deriv_applications(id),
  record_date DATE NOT NULL,
  total_markup NUMERIC(18,2) NOT NULL DEFAULT 0,
  contract_count INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'deriv' CHECK (source IN ('deriv', 'calculated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, record_date)
);

-- ============================================================
-- COMMISSION RECORDS
-- ============================================================
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  external_reference TEXT,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('markup', 'partner', 'referral', 'other')),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  record_date DATE NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'deriv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS (traders using the connected app)
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  external_client_id TEXT NOT NULL,
  registration_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  total_contracts INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC(18,2) NOT NULL DEFAULT 0,
  generated_markup NUMERIC(18,2) NOT NULL DEFAULT 0,
  generated_commission NUMERIC(18,2) NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, external_client_id)
);

-- ============================================================
-- TRADING ACTIVITY
-- ============================================================
CREATE TABLE trading_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  external_contract_id TEXT NOT NULL,
  client_reference TEXT,
  contract_type TEXT NOT NULL,
  underlying TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  result TEXT CHECK (result IN ('win', 'loss', 'pending', 'open', 'sold')),
  payout NUMERIC(18,2) DEFAULT 0,
  markup NUMERIC(18,2) DEFAULT 0,
  entry_tick REAL,
  exit_tick REAL,
  contract_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, external_contract_id)
);

-- ============================================================
-- EARNINGS (aggregated view)
-- ============================================================
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  markup_earnings NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_earnings NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_earnings NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, period_start, period_end)
);

-- ============================================================
-- SYNC JOBS
-- ============================================================
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES deriv_integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'markup', 'commissions', 'clients', 'activity')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  actor_email TEXT,
  organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'business', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  max_applications INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 3,
  max_data_history_days INTEGER NOT NULL DEFAULT 30,
  sync_frequency_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('markup', 'commission', 'earnings', 'clients', 'trading')),
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'pdf')),
  date_from DATE,
  date_to DATE,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_deriv_integrations_org ON deriv_integrations(organization_id);
CREATE INDEX idx_deriv_integrations_status ON deriv_integrations(connection_status);
CREATE INDEX idx_deriv_applications_integration ON deriv_applications(integration_id);
CREATE INDEX idx_markup_records_org_date ON markup_records(organization_id, record_date DESC);
CREATE INDEX idx_markup_records_integration ON markup_records(integration_id);
CREATE INDEX idx_commission_records_org_date ON commission_records(organization_id, record_date DESC);
CREATE INDEX idx_commission_records_integration ON commission_records(integration_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_integration ON clients(integration_id);
CREATE INDEX idx_trading_activity_org ON trading_activity(organization_id);
CREATE INDEX idx_trading_activity_integration ON trading_activity(integration_id);
CREATE INDEX idx_trading_activity_date ON trading_activity(contract_time DESC);
CREATE INDEX idx_earnings_org_period ON earnings(organization_id, period_start DESC);
CREATE INDEX idx_sync_jobs_integration ON sync_jobs(integration_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_reports_org ON reports(organization_id);


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deriv_integrations_updated_at BEFORE UPDATE ON deriv_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deriv_applications_updated_at BEFORE UPDATE ON deriv_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = user_uuid AND status = 'active'
  UNION
  SELECT id FROM organizations WHERE owner_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid AND organization_id = org_uuid AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM organizations WHERE id = org_uuid AND owner_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid AND organization_id = org_uuid
    AND role IN ('org_owner', 'org_admin') AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM organizations WHERE id = org_uuid AND owner_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

