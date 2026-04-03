import * as XLSX from 'xlsx';

/** Convert an Excel workbook buffer to readable text for the AI */
export function excelToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];

  for (const name of wb.SheetNames) {
    parts.push(`=== Feuille: ${name} ===`);
    const ws = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    parts.push(csv);
    parts.push('');
  }

  return parts.join('\n');
}
