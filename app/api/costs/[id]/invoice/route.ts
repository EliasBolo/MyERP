import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

// Magic bytes for server-side type verification (first few bytes)
const MAGIC: Record<string, (buf: Buffer) => boolean> = {
  'application/pdf': (b) => b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': (b) => b.length >= 6 && (b.slice(0, 6).toString() === 'GIF87a' || b.slice(0, 6).toString() === 'GIF89a'),
  'image/webp': (b) => b.length >= 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP',
};

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 85;

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
  let data = Buffer.from(arrayBuffer);
  let fileName = file.name || 'invoice';
  let mimeType = (file.type || '').toLowerCase().trim() || 'application/octet-stream';

  if (data.length > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Μέγιστο μέγεθος αρχείου: ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIMES.includes(mimeType as any)) {
    return NextResponse.json(
      { error: 'Επιτρεπόμενα: PDF ή εικόνες (JPEG, PNG, GIF, WebP)' },
      { status: 400 }
    );
  }

  const verify = MAGIC[mimeType];
  if (verify && !verify(data)) {
    return NextResponse.json({ error: 'Ο τύπος αρχείου δεν ταιριάζει με το περιεχόμενο' }, { status: 400 });
  }

  const isImage = mimeType.startsWith('image/');
  if (isImage) {
    try {
      const pipeline = sharp(data);
      const meta = await pipeline.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      const needsResize = w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION;

      if (needsResize) {
        pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true });
      }
      data = await pipeline
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      mimeType = 'image/jpeg';
      if (!fileName.toLowerCase().endsWith('.jpg') && !fileName.toLowerCase().endsWith('.jpeg')) {
        fileName = fileName.replace(/\.[^.]+$/i, '') + '.jpg';
      }
    } catch (e) {
      console.error('Image processing failed:', e);
      return NextResponse.json({ error: 'Αποτυχία επεξεργασίας εικόνας' }, { status: 400 });
    }
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
