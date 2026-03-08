import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/admin/businesses/[id]/subscription — update tier, status, expiry
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'master_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { subscriptionTier, subscriptionStatus, licenseExpiresAt, isActive } = body;

  const updateData: any = {};
  if (subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionTier;
  if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
  if (licenseExpiresAt !== undefined) {
    updateData.licenseExpiresAt = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
  }
  if (isActive !== undefined) updateData.isActive = isActive;

  try {
    const business = await db.business.update({
      where: { id: params.id },
      data: updateData,
      include: { subscriptionPhases: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json({ business });
  } catch {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }
}
