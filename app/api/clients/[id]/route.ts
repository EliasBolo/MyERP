import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const client = await db.client.update({
      where: { id: params.id },
      data: {
        name: body.name,
        code: body.code?.toUpperCase(),
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
        type: body.type,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
        notes: body.notes || null,
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json({ client });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.client.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
