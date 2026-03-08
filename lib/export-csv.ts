import Papa from 'papaparse';

export function exportToCSV(
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename: string
): void {
  const csvData = data.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  const csv = Papa.unparse(csvData, {
    quotes: true,
    delimiter: ';', // Excel-friendly for Greek locale
    newline: '\r\n',
  });

  // Add BOM for proper UTF-8 encoding in Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${Date.now()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}
