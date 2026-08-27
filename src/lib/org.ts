import { sql } from './db';
import { getCurrentUser, type CurrentUser } from './auth';

export interface OrgContext {
  user: CurrentUser;
  orgId: string;
  orgRole: string;
}

/**
 * Resolves the signed-in user's active organization (owner or accepted member).
 * Returns null if there's no session or no org membership, so callers can
 * respond 401/403 without leaking details.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await sql`
    SELECT om.organization_id AS org_id, om.role AS org_role
    FROM organization_members om
    WHERE om.user_id = ${user.id} AND om.status = 'active'
    UNION
    SELECT o.id AS org_id, 'org_owner' AS org_role
    FROM organizations o
    WHERE o.owner_id = ${user.id}
    LIMIT 1
  `;

  const membership = rows[0];
  if (!membership) return null;

  return { user, orgId: membership.org_id, orgRole: membership.org_role };
}

/**
 * For admin API routes: verifies the signed-in user is a super_admin,
 * checked live against Neon (not just a JWT claim), same trust model as
 * the middleware's admin gate.
 */
export async function requireSuperAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') return null;

  // Re-verify live (role could have changed since this session's JWT was issued)
  const rows = await sql`SELECT role FROM users WHERE id = ${user.id}`;
  if (rows[0]?.role !== 'super_admin') return null;

  return user;
}
