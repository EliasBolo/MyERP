import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { current, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id as string },
      select: { password: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isValid = await compare(current, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Λάθος τρέχων κωδικός' }, { status: 401 });
    }

    const hashed = await hash(newPassword, 12);
    await db.user.update({
      where: { id: session.user.id as string },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
