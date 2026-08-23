export type UserRole = 'super_admin' | 'org_owner' | 'org_admin' | 'staff';
export type OrgStatus = 'active' | 'suspended' | 'deleted';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'syncing';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed';
export type SyncType = 'full' | 'markup' | 'commissions' | 'clients' | 'activity';
export type CommissionType = 'markup' | 'partner' | 'referral' | 'other';
export type CommissionStatus = 'pending' | 'paid' | 'cancelled';
export type ContractResult = 'win' | 'loss' | 'pending' | 'open' | 'sold';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type SubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise';
export type ReportType = 'markup' | 'commission' | 'earnings' | 'clients' | 'trading';
export type ReportFormat = 'csv' | 'pdf';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  status: OrgStatus;
  subscription_plan: SubscriptionPlan;
  max_applications: number;
  max_users: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  status: 'pending' | 'active' | 'removed';
  created_at: string;
}

export interface DerivIntegration {
  id: string;
  organization_id: string;
  deriv_app_id: string;
  app_name: string | null;
  app_status: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string[];
  connection_status: ConnectionStatus;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  sync_error: string | null;
  markup_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DerivApplication {
  id: string;
  integration_id: string;
  organization_id: string;
  external_app_id: string;
  name: string;
  status: string | null;
  redirect_uri: string | null;
  verification_url: string | null;
  scopes: string[];
  markup_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface MarkupRecord {
  id: string;
  organization_id: string;
  integration_id: string;
  application_id: string | null;
  record_date: string;
  total_markup: number;
  contract_count: number;
  total_volume: number;
  currency: string;
  source: 'deriv' | 'calculated';
  created_at: string;
}

export interface CommissionRecord {
  id: string;
  organization_id: string;
  integration_id: string;
  external_reference: string | null;
  commission_type: CommissionType;
  amount: number;
  currency: string;
  status: CommissionStatus;
  record_date: string;
  description: string | null;
  source: string;
  created_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  integration_id: string;
  external_client_id: string;
  registration_date: string | null;
  status: string | null;
  total_contracts: number;
  total_volume: number;
  generated_markup: number;
  generated_commission: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradingActivity {
  id: string;
  organization_id: string;
  integration_id: string;
  client_id: string | null;
  external_contract_id: string;
  client_reference: string | null;
  contract_type: string;
  underlying: string | null;
  amount: number;
  currency: string;
  result: ContractResult | null;
  payout: number | null;
  markup: number | null;
  entry_tick: number | null;
  exit_tick: number | null;
  contract_time: string | null;
  created_at: string;
}

export interface Earnings {
  id: string;
  organization_id: string;
  integration_id: string;
  period_start: string;
  period_end: string;
  markup_earnings: number;
  commission_earnings: number;
  other_earnings: number;
  total_earnings: number;
  currency: string;
  created_at: string;
}

export interface SyncJob {
  id: string;
  organization_id: string;
  integration_id: string;
  status: SyncStatus;
  sync_type: SyncType;
  records_synced: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  organization_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan: SubscriptionPlan;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  max_applications: number;
  max_users: number;
  max_data_history_days: number;
  sync_frequency_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  organization_id: string;
  user_id: string;
  report_type: ReportType;
  format: ReportFormat;
  date_from: string | null;
  date_to: string | null;
  file_url: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface MarkupStatistics {
  date_from: string;
  date_to: string;
  total_markup: number;
  contract_count: number;
  total_volume: number;
  daily_breakdown: {
    date: string;
    markup: number;
    contracts: number;
    volume: number;
  }[];
}

export interface DashboardStats {
  totalEarnings: number;
  totalMarkup: number;
  totalCommissions: number;
  activeClients: number;
  totalContracts: number;
  todayMarkup: number;
  thisMonthMarkup: number;
  lastMonthMarkup: number;
  earningsTrend: { date: string; amount: number }[];
  markupTrend: { date: string; amount: number }[];
  commissionTrend: { date: string; amount: number }[];
  recentActivity: TradingActivity[];
  recentCommissions: CommissionRecord[];
  topClients: Client[];
}

export interface AdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  connectedApplications: number;
  totalTrackedMarkup: number;
  totalTrackedCommissions: number;
  totalVerifiedEarnings: number;
  activeUsers: number;
  failedIntegrations: number;
}
