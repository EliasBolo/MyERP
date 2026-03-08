import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.role === 'user' && currentUser.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.role !== undefined && currentUser.role !== 'user') {
      updateData.role = body.role;
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password) {
      updateData.password = await hash(body.password, 12);
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, twoFactorEnabled: true, businessId: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as any;
  if (currentUser.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }
  if (currentUser.role === 'user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
