import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE /api/admin/businesses/[id]/payments/[paymentId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.customerPayment.delete({
      where: { id: params.paymentId, businessId: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
