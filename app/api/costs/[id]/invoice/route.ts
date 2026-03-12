import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

async function getCostAndCheckAuth(costId: string) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), cost: null };
  const businessId = (session.user as any).businessId;
  if (!businessId) return { error: NextResponse.json({ error: 'No business' }, { status: 400 }), cost: null };
  const cost = await db.cost.findFirst({
    where: { id: costId, businessId },
    include: { invoiceFile: true },
  });
  if (!cost) return { error: NextResponse.json({ error: 'Cost not found' }, { status: 404 }), cost: null };
  return { error: null, cost };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, cost } = await getCostAndCheckAuth(id);
  if (error) return error;
  if (!cost?.invoiceFile) return NextResponse.json({ error: 'No invoice file' }, { status: 404 });

  const { fileName, mimeType, data } = cost.invoiceFile;
  const buffer = Buffer.from(data);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, cost } = await getCostAndCheckAuth(id);
  if (error) return error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  const fileName = file.name || 'invoice';
  const mimeType = file.type || 'application/octet-stream';

  const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
  if (data.length > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 400 });
  }

  try {
    await db.costInvoiceFile.upsert({
      where: { costId: id },
      create: { costId: id, fileName, mimeType, data },
      update: { fileName, mimeType, data },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, cost } = await getCostAndCheckAuth(id);
  if (error) return error;
  if (!cost?.invoiceFile) return NextResponse.json({ success: true });

  try {
    await db.costInvoiceFile.delete({ where: { costId: id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
