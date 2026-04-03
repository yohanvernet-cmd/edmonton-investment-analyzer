import * as XLSX from 'xlsx';
import type { ProFormaData, UnitDetail, LoanDetails, ExpenseBreakdown } from '@/types';

/** Extract pro forma data from an Excel buffer */
export function parseExcel(buffer: Buffer): ProFormaData {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const allCells = extractAllCells(wb);

  const salePrice = findNumericValue(allCells, [
    'sale price', 'purchase price', 'prix de vente', 'asking price', 'total price',
  ]) || 0;

  const numberOfUnits = findNumericValue(allCells, [
    'number of units', 'units', 'nombre d\'unités', 'total units', '# of units', 'unit count',
  ]) || 0;

  const address = findTextValue(allCells, [
    'address', 'adresse', 'property address', 'location', 'civic address',
  ]) || 'Unknown';

  const units = extractUnits(allCells, numberOfUnits);
  const loan = extractLoan(allCells, salePrice);
  const expenses = extractExpenses(allCells, salePrice);

  const totalMonthlyRevenue = units.reduce((s, u) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);

  const downPayment = findNumericValue(allCells, ['down payment', 'mise de fonds', 'equity']) || salePrice * 0.2;
  const closingCosts = findNumericValue(allCells, ['closing costs', 'frais de clôture']) || salePrice * 0.015;

  return {
    salePrice, numberOfUnits, address, units, loan, expenses,
    totalMonthlyRevenue,
    totalAnnualRevenue: totalMonthlyRevenue * 12,
    downPayment, closingCosts,
  };
}

// ── Helpers ──

interface CellEntry { row: number; col: number; sheet: string; label: string; value: any; rawValue: any }

function extractAllCells(wb: XLSX.WorkBook): CellEntry[] {
  const cells: CellEntry[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell) {
          cells.push({
            row: r, col: c, sheet: name,
            label: String(cell.v ?? '').toLowerCase().trim(),
            value: cell.v, rawValue: cell,
          });
        }
      }
    }
  }
  return cells;
}

function findNumericValue(cells: CellEntry[], keywords: string[]): number | null {
  for (const kw of keywords) {
    const match = cells.find(c => c.label.includes(kw.toLowerCase()));
    if (match) {
      // Look for numeric value in adjacent cells (same row, next columns)
      const adjacent = cells.filter(c => c.sheet === match.sheet && c.row === match.row && c.col > match.col);
      for (const a of adjacent) {
        const num = parseFloat(String(a.value).replace(/[$,\s]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
  }
  return null;
}

function findTextValue(cells: CellEntry[], keywords: string[]): string | null {
  for (const kw of keywords) {
    const match = cells.find(c => c.label.includes(kw.toLowerCase()));
    if (match) {
      const adjacent = cells.filter(c => c.sheet === match.sheet && c.row === match.row && c.col > match.col);
      for (const a of adjacent) {
        const txt = String(a.value).trim();
        if (txt.length > 2) return txt;
      }
    }
  }
  return null;
}

function extractUnits(cells: CellEntry[], count: number): UnitDetail[] {
  const units: UnitDetail[] = [];
  const unitKeywords = ['unit', 'unité', 'suite', 'apt', 'logement'];
  const rentKeywords = ['rent', 'loyer', 'monthly rent', 'revenue'];

  // Try to find unit rows
  const unitRows = cells.filter(c => unitKeywords.some(k => c.label.includes(k)));

  for (const ur of unitRows) {
    const rowCells = cells.filter(c => c.sheet === ur.sheet && c.row === ur.row);
    const rentCell = rowCells.find(c => {
      const n = parseFloat(String(c.value).replace(/[$,]/g, ''));
      return !isNaN(n) && n > 200 && n < 10000;
    });

    if (rentCell) {
      const config = detectConfiguration(ur.label);
      units.push({
        type: ur.label,
        bedrooms: detectBedrooms(ur.label),
        configuration: config,
        monthlyRent: parseFloat(String(rentCell.value).replace(/[$,]/g, '')),
        parkingFee: findFeeInRow(rowCells, ['parking', 'garage', 'stationnement']),
        petFee: findFeeInRow(rowCells, ['pet', 'animal', 'animaux']),
      });
    }
  }

  // Fallback: generate placeholder units if none found
  if (units.length === 0 && count > 0) {
    for (let i = 0; i < count; i++) {
      units.push({ type: `Unit ${i + 1}`, bedrooms: 2, configuration: 'unknown', monthlyRent: 0, parkingFee: 0, petFee: 0 });
    }
  }

  return units;
}

function detectBedrooms(label: string): number {
  const match = label.match(/(\d)\s*(?:bed|br|chambre|ch)/i);
  return match ? parseInt(match[1]) : 2;
}

function detectConfiguration(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('basement') || l.includes('sous-sol') || l.includes('bsmt')) return 'basement';
  if (l.includes('upper') || l.includes('étage') || l.includes('top') || l.includes('supérieur')) return 'upper';
  if (l.includes('main') || l.includes('principal') || l.includes('ground')) return 'main';
  return 'unknown';
}

function findFeeInRow(rowCells: CellEntry[], keywords: string[]): number {
  for (const c of rowCells) {
    if (keywords.some(k => c.label.includes(k))) {
      const num = parseFloat(String(c.value).replace(/[$,]/g, ''));
      if (!isNaN(num) && num > 0 && num < 1000) return num;
    }
  }
  return 0;
}

function extractLoan(cells: CellEntry[], salePrice: number): LoanDetails {
  const amount = findNumericValue(cells, ['mortgage', 'loan amount', 'hypothèque', 'prêt']) || salePrice * 0.8;
  const rate = findNumericValue(cells, ['interest rate', 'taux d\'intérêt', 'rate', 'taux']) || 5.0;
  const amort = findNumericValue(cells, ['amortization', 'amortissement', 'term', 'durée']) || 25;

  const monthlyRate = (rate / 100) / 12;
  const n = amort * 12;
  const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  return { amount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100 };
}

function extractExpenses(cells: CellEntry[], salePrice: number): ExpenseBreakdown {
  const propertyTax = findNumericValue(cells, ['property tax', 'taxes foncières', 'municipal tax', 'taxes']) || 0;
  const insurance = findNumericValue(cells, ['insurance', 'assurance']) || 0;
  const maintenance = findNumericValue(cells, ['maintenance', 'entretien', 'repairs', 'réparations']) || 0;
  const management = findNumericValue(cells, ['management', 'gestion', 'property management']) || 0;
  const vacancyPct = findNumericValue(cells, ['vacancy', 'vacance', 'inoccupation']) || 3;
  const caretaker = findNumericValue(cells, ['caretaker', 'concierge', 'gardien', 'janitor']) || 0;
  const capitalReserve = findNumericValue(cells, ['capital reserve', 'réserve', 'capex', 'capital expenditure']) || 0;
  const utilities = findNumericValue(cells, ['utilities', 'services publics', 'hydro', 'gas', 'water']) || 0;
  const other = findNumericValue(cells, ['other expenses', 'autres dépenses', 'miscellaneous']) || 0;

  const totalAnnual = propertyTax + insurance + maintenance + management + caretaker + capitalReserve + utilities + other;

  return {
    propertyTax, insurance, maintenance, management,
    vacancy: vacancyPct, vacancyDollar: 0, // calculated later
    caretaker, capitalReserve, utilities, other, totalAnnual,
  };
}
