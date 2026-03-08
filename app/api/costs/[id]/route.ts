import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const cost = await db.cost.update({
      where: { id: params.id },
      data: {
        category: body.category,
        description: body.description,
        amount: parseFloat(body.amount),
        date: new Date(body.date),
        recurrence: body.recurrence,
        vendor: body.vendor || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ cost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await db.cost.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
