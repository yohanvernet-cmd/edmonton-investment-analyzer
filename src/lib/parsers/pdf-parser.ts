import type { ProFormaData, UnitDetail, LoanDetails, ExpenseBreakdown } from '@/types';

/**
 * Parse pro forma data from PDF text content.
 * Uses regex patterns to extract financial data from unstructured text.
 */
export function parsePdfText(text: string): ProFormaData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  const salePrice = extractAmount(fullText, [
    /(?:sale|purchase|asking)\s*price[:\s]*\$?([\d,]+)/i,
    /prix\s*de\s*vente[:\s]*\$?([\d,]+)/i,
    /total\s*price[:\s]*\$?([\d,]+)/i,
  ]);

  const numberOfUnits = extractInt(fullText, [
    /(\d+)\s*(?:units?|unités?|suites?)/i,
    /(?:number of units|nombre d'unités)[:\s]*(\d+)/i,
  ]) || 0;

  const address = extractAddress(lines);
  const units = extractUnitsFromText(lines, numberOfUnits);
  const loan = extractLoanFromText(fullText, salePrice);
  const expenses = extractExpensesFromText(fullText, salePrice);

  const totalMonthlyRevenue = units.reduce((s, u) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);
  const downPayment = extractAmount(fullText, [/down\s*payment[:\s]*\$?([\d,]+)/i]) || salePrice * 0.2;
  const closingCosts = extractAmount(fullText, [/closing\s*costs?[:\s]*\$?([\d,]+)/i]) || salePrice * 0.015;

  return {
    salePrice, numberOfUnits, address, units, loan, expenses,
    totalMonthlyRevenue, totalAnnualRevenue: totalMonthlyRevenue * 12,
    downPayment, closingCosts,
  };
}

function extractAmount(text: string, patterns: RegExp[]): number {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseFloat(m[1].replace(/,/g, ''));
  }
  return 0;
}

function extractInt(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function extractAddress(lines: string[]): string {
  // Look for Edmonton addresses
  const addrLine = lines.find(l =>
    /\d+\s+\w+.*(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|crescent|cres|way|place|pl).*edmonton/i.test(l) ||
    /\d+\s+\w+.*(?:AB|Alberta|T\d[A-Z]\s?\d[A-Z]\d)/i.test(l)
  );
  return addrLine?.trim() || 'Address not found';
}

function extractUnitsFromText(lines: string[], count: number): UnitDetail[] {
  const units: UnitDetail[] = [];
  const unitPattern = /(?:unit|suite|apt|logement)\s*#?\s*\d*/i;

  for (let i = 0; i < lines.length; i++) {
    if (unitPattern.test(lines[i])) {
      const rentMatch = lines.slice(i, i + 3).join(' ').match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:\/\s*month|per\s*month|mensuel)/i);
      if (rentMatch) {
        const rent = parseFloat(rentMatch[1].replace(/,/g, ''));
        const label = lines[i].toLowerCase();
        units.push({
          type: lines[i].trim(),
          bedrooms: detectBedrooms(label),
          configuration: detectConfig(label),
          monthlyRent: rent,
          parkingFee: 0,
          petFee: 0,
        });
      }
    }
  }

  if (units.length === 0 && count > 0) {
    for (let i = 0; i < count; i++) {
      units.push({ type: `Unit ${i + 1}`, bedrooms: 2, configuration: 'unknown', monthlyRent: 0, parkingFee: 0, petFee: 0 });
    }
  }
  return units;
}

function detectBedrooms(label: string): number {
  const m = label.match(/(\d)\s*(?:bed|br|chambre)/i);
  return m ? parseInt(m[1]) : 2;
}

function detectConfig(label: string): string {
  if (/basement|sous-sol|bsmt/i.test(label)) return 'basement';
  if (/upper|étage|top/i.test(label)) return 'upper';
  if (/main|principal|ground/i.test(label)) return 'main';
  return 'unknown';
}

function extractLoanFromText(text: string, salePrice: number): LoanDetails {
  const amount = extractAmount(text, [/(?:mortgage|loan|hypothèque)[:\s]*\$?([\d,]+)/i]) || salePrice * 0.8;
  const rateMatch = text.match(/(?:interest|taux)[:\s]*([\d.]+)\s*%/i);
  const rate = rateMatch ? parseFloat(rateMatch[1]) : 5.0;
  const amortMatch = text.match(/(?:amortization|amortissement)[:\s]*(\d+)/i);
  const amort = amortMatch ? parseInt(amortMatch[1]) : 25;

  const mr = (rate / 100) / 12;
  const n = amort * 12;
  const monthlyPayment = amount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);

  return { amount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100, cmhcInsurance: 0 };
}

function extractExpensesFromText(text: string, salePrice: number): ExpenseBreakdown {
  const propertyTax = extractAmount(text, [/(?:property tax|taxes? foncières?)[:\s]*\$?([\d,]+)/i]);
  const insurance = extractAmount(text, [/(?:insurance|assurance)[:\s]*\$?([\d,]+)/i]);
  const maintenance = extractAmount(text, [/(?:maintenance|entretien|repairs)[:\s]*\$?([\d,]+)/i]);
  const management = extractAmount(text, [/(?:management|gestion)[:\s]*\$?([\d,]+)/i]);
  const vacancyMatch = text.match(/(?:vacancy|vacance|inoccupation)[:\s]*([\d.]+)\s*%/i);
  const vacancy = vacancyMatch ? parseFloat(vacancyMatch[1]) : 3;
  const caretaker = extractAmount(text, [/(?:caretaker|concierge|janitor)[:\s]*\$?([\d,]+)/i]);
  const capitalReserve = extractAmount(text, [/(?:capital reserve|réserve|capex)[:\s]*\$?([\d,]+)/i]);
  const utilities = extractAmount(text, [/(?:utilities|services publics)[:\s]*\$?([\d,]+)/i]);
  const other = extractAmount(text, [/(?:other|autres)[:\s]*\$?([\d,]+)/i]);

  const totalAnnual = propertyTax + insurance + maintenance + management + caretaker + capitalReserve + utilities + other;

  return {
    propertyTax, insurance, maintenance, management,
    vacancy, vacancyDollar: 0,
    caretaker, capitalReserve, utilities, other, totalAnnual,
  };
}
