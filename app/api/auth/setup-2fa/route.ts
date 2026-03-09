import { NextRequest, NextResponse } from 'next/server';
import { auth, generateTOTPSecret, verifyTOTP } from '@/lib/auth';
import { db } from '@/lib/db';
import QRCode from 'qrcode';

// GET: Generate secret and QR code (reuse existing if setup in progress to avoid overwriting)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    let secretBase32: string;
    let otpauthUrl: string;

    if (user?.twoFactorSecret && !user.twoFactorEnabled) {
      secretBase32 = user.twoFactorSecret;
      otpauthUrl = `otpauth://totp/MyERP:${encodeURIComponent(session.user.email as string)}?secret=${secretBase32}&issuer=MyERP`;
    } else {
      const secret = generateTOTPSecret(session.user.email as string);
      secretBase32 = secret.base32;
      otpauthUrl = secret.otpauth_url!;
      await db.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secretBase32 },
      });
    }

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      secret: secretBase32,
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
