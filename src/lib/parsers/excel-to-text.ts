import * as XLSX from 'xlsx';

/** Convert an Excel workbook buffer to readable text for the AI.
 *  Outputs each sheet as both CSV and a row-by-row format for clarity. */
export function excelToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];

  for (const name of wb.SheetNames) {
    parts.push(`\n=== Feuille: ${name} ===\n`);
    const ws = wb.Sheets[name];

    // Row-by-row with cell references for clarity
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowParts: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
          rowParts.push(String(cell.v).trim());
        }
      }
      if (rowParts.length > 0) {
        parts.push(`Row ${r + 1}: ${rowParts.join(' | ')}`);
      }
    }
  }

  return parts.join('\n');
}
