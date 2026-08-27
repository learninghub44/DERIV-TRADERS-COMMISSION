import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const notifications = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { id, all } = await request.json();

  if (all) {
    await sql`
      UPDATE notifications SET read = TRUE
      WHERE user_id = ${user.id} AND read = FALSE
    `;
    return NextResponse.json({ ok: true });
  }

  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  await sql`
    UPDATE notifications SET read = TRUE
    WHERE id = ${id} AND user_id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}
