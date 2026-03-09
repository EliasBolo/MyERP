import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// PATCH /api/admin/users/[id] — update isActive or password
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { isActive, password, name, reset2fa } = body;

  // Safety: never allow modifying a master_admin via this endpoint
  const target = await db.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: 'Χρήστης δεν βρέθηκε' }, { status: 404 });
  }
  if (target.role === 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updateData: Record<string, any> = {};
  if (typeof isActive === 'boolean') updateData.isActive = isActive;
  if (name?.trim()) updateData.name = name.trim();
  if (reset2fa === true) {
    updateData.twoFactorEnabled = false;
    updateData.twoFactorSecret = null;
  }
  if (password) {
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' },
        { status: 400 }
      );
    }
    updateData.password = await hash(password, 12);
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      business: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user: updated });
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Safety: never delete a master_admin
  const target = await db.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: 'Χρήστης δεν βρέθηκε' }, { status: 404 });
  }
  if (target.role === 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
