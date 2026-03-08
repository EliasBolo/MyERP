import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ clients: [] });

  const clients = await db.client.findMany({
    where: { businessId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const businessId = (session.user as any).businessId;
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 });

  try {
    const body = await req.json();

    // Auto-generate code if empty
    let code = body.code?.trim()?.toUpperCase();
    if (!code) {
      const count = await db.client.count({ where: { businessId } });
      code = `CL${String(count + 1).padStart(4, '0')}`;
    }

    const existing = await db.client.findUnique({
      where: { code_businessId: { code, businessId } },
    });
    if (existing) return NextResponse.json({ error: 'Ο κωδικός υπάρχει ήδη' }, { status: 409 });

    const client = await db.client.create({
      data: {
        name: body.name,
        code,
        vatNumber: body.vatNumber || null,
        taxOffice: body.taxOffice || null,
        address: body.address || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        country: body.country || 'GR',
        phone: body.phone || null,
        mobile: body.mobile || null,
        email: body.email || null,
        contactName: body.contactName || null,
        type: body.type || 'customer',
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
        notes: body.notes || null,
        isActive: body.isActive !== false,
        businessId,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
