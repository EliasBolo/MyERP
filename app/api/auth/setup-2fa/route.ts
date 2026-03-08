import { NextRequest, NextResponse } from 'next/server';
import { auth, generateTOTPSecret, verifyTOTP } from '@/lib/auth';
import { db } from '@/lib/db';
import QRCode from 'qrcode';

// GET: Generate secret and QR code
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const secret = generateTOTPSecret(session.user.email as string);

    // Store temp secret in DB
    await db.user.update({
      where: { id: session.user.id as string },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Verify and enable 2FA
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { code } = await req.json();
    const userId = session.user.id as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: 'No secret found' }, { status: 400 });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Μη έγκυρος κωδικός' }, { status: 401 });
    }

    await db.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Disable 2FA
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.user.update({
      where: { id: session.user.id as string },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
