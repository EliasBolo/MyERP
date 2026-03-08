import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFOptions {
  title: string;
  subtitle?: string;
  businessName?: string;
  columns: { header: string; dataKey: string }[];
  data: Record<string, any>[];
  footer?: string;
}

export function exportToPDF(options: PDFOptions): void {
  const { title, subtitle, businessName, columns, data, footer } = options;

  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42); // dark background
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 18);

  if (businessName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(businessName, 14, 26);
  }

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 33);
  }

  // Date
  const dateStr = new Date().toLocaleDateString('el-GR');
  doc.setFontSize(9);
  doc.text(`Ημ/νία: ${dateStr}`, pageWidth - 14, 26, { align: 'right' });

  // Table
  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => row[c.dataKey] ?? '')),
    startY: 45,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    theme: 'striped',
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    if (footer) {
      doc.text(footer, 14, doc.internal.pageSize.getHeight() - 8);
    }
    doc.text(
      `Σελίδα ${i} από ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  // Save
  const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(filename);
}

export function exportInvoicePDF(invoice: any, business: any): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Business name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name || 'MyERP', 14, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (business.address) doc.text(business.address, 14, 30);
  if (business.phone) doc.text(`Τηλ: ${business.phone}`, 14, 36);
  if (business.vatNumber) doc.text(`ΑΦΜ: ${business.vatNumber}`, 14, 42);

  // Invoice number & type
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.type === 'SALE' ? 'ΤΙΜΟΛΟΓΙΟ' : 'ΠΑΡΑΣΤΑΤΙΚΟ', pageWidth - 14, 18, {
    align: 'right',
  });
  doc.setFontSize(12);
  doc.text(`#${invoice.number}`, pageWidth - 14, 28, { align: 'right' });

  // Client info
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ΑΠΟΔΕΚΤΗΣ:', 14, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client?.name || '', 14, 70);
  if (invoice.client?.vatNumber) doc.text(`ΑΦΜ: ${invoice.client.vatNumber}`, 14, 77);
  if (invoice.client?.address) doc.text(invoice.client.address, 14, 84);

  // Invoice dates
  doc.setFont('helvetica', 'bold');
  doc.text('Ημ/νία Έκδοσης:', pageWidth - 80, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date(invoice.issueDate).toLocaleDateString('el-GR'),
    pageWidth - 14,
    62,
    { align: 'right' }
  );

  if (invoice.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ημ/νία Λήξης:', pageWidth - 80, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(
      new Date(invoice.dueDate).toLocaleDateString('el-GR'),
      pageWidth - 14,
      70,
      { align: 'right' }
    );
  }

  // Items table
  autoTable(doc, {
    head: [['Περιγραφή', 'Ποσότητα', 'Τιμή', 'ΦΠΑ%', 'ΦΠΑ', 'Σύνολο']],
    body: invoice.items?.map((item: any) => [
      item.description,
      item.quantity,
      `€${item.unitPrice.toFixed(2)}`,
      `${item.vatRate}%`,
      `€${item.vatAmount.toFixed(2)}`,
      `€${item.total.toFixed(2)}`,
    ]) || [],
    startY: 95,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Υποσύνολο:`, pageWidth - 60, finalY);
  doc.text(`€${invoice.subtotal?.toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

  doc.text(`ΦΠΑ:`, pageWidth - 60, finalY + 8);
  doc.text(`€${invoice.vatAmount?.toFixed(2)}`, pageWidth - 14, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`ΣΥΝΟΛΟ:`, pageWidth - 60, finalY + 18);
  doc.text(`€${invoice.total?.toFixed(2)}`, pageWidth - 14, finalY + 18, { align: 'right' });

  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Σημειώσεις: ${invoice.notes}`, 14, finalY + 30);
  }

  doc.save(`invoice-${invoice.number}.pdf`);
}
