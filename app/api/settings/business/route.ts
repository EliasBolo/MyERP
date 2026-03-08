import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ business: null });

  const business = await db.business.findUnique({ where: { id: businessId } });
  return NextResponse.json({ business });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as any;
  if (user.role !== 'business_admin' && user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const businessId = user.businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();
    const business = await db.business.update({
      where: { id: businessId },
      data: {
        name: body.name,
        vatNumber: body.vatNumber || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        currency: body.currency || 'EUR',
      },
    });
    return NextResponse.json({ business });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
