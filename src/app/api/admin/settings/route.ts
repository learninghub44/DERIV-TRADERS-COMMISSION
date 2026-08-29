import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/org';
import { getAllSettingStatuses, setSetting, PLATFORM_SETTING_KEYS, type PlatformSettingKey } from '@/lib/settings';

/**
 * Platform settings, editable by the super_admin from /admin/settings.
 * Values written here take priority over the matching environment
 * variable (see src/lib/settings.ts for the fallback mapping) - once set
 * through this page, there is nothing left to configure in Cloudflare.
 */

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await getAllSettingStatuses();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const updates: Partial<Record<PlatformSettingKey, string>> = body.settings || {};

  const keysToUpdate = Object.keys(updates).filter((k) =>
    (PLATFORM_SETTING_KEYS as readonly string[]).includes(k)
  ) as PlatformSettingKey[];

  if (keysToUpdate.length === 0) {
    return NextResponse.json({ error: 'No valid settings provided.' }, { status: 400 });
  }

  for (const key of keysToUpdate) {
    const value = updates[key];
    if (typeof value !== 'string') continue;
    await setSetting(key, value.trim(), admin.id);
  }

  // Audit log (never records the actual secret values, only which keys changed)
  await sql`
    INSERT INTO audit_logs (actor_id, actor_email, action, resource_type, details)
    VALUES (
      ${admin.id}, ${admin.email}, 'platform_settings_updated', 'platform_settings',
      ${JSON.stringify({ keys: keysToUpdate })}
    )
  `;

  const settings = await getAllSettingStatuses();
  return NextResponse.json({ ok: true, settings });
}
