import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyTOTP } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();
    const userId = session.user.id as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Μη έγκυρος κωδικός' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
