import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const { fullName, email, password, orgName } = await request.json();

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase();

  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const verifyToken = randomBytes(32).toString('hex');
  const userId = randomUUID();

  await sql`
    INSERT INTO users (id, email, password_hash, full_name, role, email_verified, email_verify_token)
    VALUES (${userId}, ${normalizedEmail}, ${passwordHash}, ${fullName}, 'org_owner', FALSE, ${verifyToken})
  `;

  const baseSlug = slugify(orgName || fullName);
  let slug = baseSlug;
  let attempt = 0;
  // Ensure slug uniqueness
  while (true) {
    const clash = await sql`SELECT id FROM organizations WHERE slug = ${slug}`;
    if (clash.length === 0) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const orgRows = await sql`
    INSERT INTO organizations (name, slug, owner_id, subscription_plan, max_applications, max_users)
    VALUES (${orgName || `${fullName}'s Organization`}, ${slug}, ${userId}, 'starter', 1, 3)
    RETURNING id
  `;
  const orgId = orgRows[0].id;

  await sql`
    INSERT INTO organization_members (organization_id, user_id, role, status, accepted_at)
    VALUES (${orgId}, ${userId}, 'org_owner', 'active', NOW())
  `;

  await sql`
    INSERT INTO subscriptions (organization_id, plan, status, max_applications, max_users, max_data_history_days, sync_frequency_hours)
    VALUES (${orgId}, 'starter', 'active', 1, 3, 30, 24)
  `;

  // TODO: send verifyToken via email (SMTP_* env vars are already scaffolded in .env.example).
  // For now the account is created but flagged unverified; verify-email page exchanges the token.

  return NextResponse.json({ ok: true });
}
