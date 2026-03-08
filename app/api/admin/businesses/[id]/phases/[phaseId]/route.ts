import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/admin/businesses/[id]/phases/[phaseId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, startDate, endDate, status, order } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (status !== undefined) updateData.status = status;
  if (order !== undefined) updateData.order = order;

  try {
    const phase = await db.subscriptionPhase.update({
      where: { id: params.phaseId, businessId: params.id },
      data: updateData,
    });
    return NextResponse.json({ phase });
  } catch {
    return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  }
}

// DELETE /api/admin/businesses/[id]/phases/[phaseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; phaseId: string } }
) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.subscriptionPhase.delete({
      where: { id: params.phaseId, businessId: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  }
}
