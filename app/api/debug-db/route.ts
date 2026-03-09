import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/debug-db — Check if DB connection works and admin user exists.
 * Use only for debugging live deployment. Remove or restrict in production.
 */
export async function GET() {
  try {
    await db.$connect();
    const admin = await db.user.findUnique({
      where: { email: 'admin@myerp.gr' },
      select: { id: true, email: true, isActive: true, role: true },
    });
    await db.$disconnect();
    return NextResponse.json({
      ok: true,
      connection: 'ok',
      adminExists: !!admin,
      admin: admin ? { email: admin.email, isActive: admin.isActive, role: admin.role } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        connection: 'error',
        error: message,
        hint: message.includes('prepared statement')
          ? 'Add ?pgbouncer=true to DATABASE_URL in Vercel'
          : message.includes('Authentication failed')
            ? 'Check DATABASE_URL password in Vercel'
            : 'Check DATABASE_URL and DIRECT_URL in Vercel',
      },
      { status: 500 }
    );
  }
}
