import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';

// POST: Reset own 2FA using password (lost device / mismatched secret recovery)
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true, twoFactorEnabled: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    const isValid = await compare(password, dbUser.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
