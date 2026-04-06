import type {
  ProFormaData, NeighborhoodAnalysis, RevenueAnalysis, ExpenseAnalysis,
  FinancialMetrics, RevisedProForma, InvestmentScore, FullAnalysis,
} from '@/types';
import { EDMONTON_MARKET, getNeighborhoodData, getMarketRent, getMarketRentLabel } from '@/lib/data/edmonton-market';

export function runFullAnalysis(proForma: ProFormaData, aiMarketRents?: Record<string, number>): FullAnalysis {
  const neighborhood = analyzeNeighborhood(proForma.address);
  const revenueAnalysis = analyzeRevenue(proForma, neighborhood, aiMarketRents);
  const expenseAnalysis = analyzeExpenses(proForma, neighborhood);
  const revisedProForma = buildRevisedProForma(proForma, revenueAnalysis, expenseAnalysis, neighborhood);
  const investmentScore = scoreInvestment(proForma, neighborhood, revenueAnalysis, expenseAnalysis, revisedProForma);

  return {
    proForma, neighborhood, revenueAnalysis, expenseAnalysis, revisedProForma, investmentScore,
    timestamp: new Date().toISOString(),
  };
}

// ── 1. Neighborhood Analysis ──
function analyzeNeighborhood(address: string): NeighborhoodAnalysis {
  const data = getNeighborhoodData(address);

  const overallScore = calculateNeighborhoodScore(data);

  return {
    demographics: {
      ownerPercent: data.ownerPercent,
      renterPercent: data.renterPercent,
      marketType: data.renterPercent > 50 ? 'Quartier de locataires' : 'Quartier de propriétaires',
      socioEconomic: data.socioEconomic,
      medianIncome: undefined,
      cityMedianIncome: undefined,
    },
    vacancy: {
      currentRate: data.vacancyRate,
      historicalTrend: data.vacancyTrend,
      cityAverage: EDMONTON_MARKET.cityAverages.vacancyRate,
    },
    marketRents: [
      { unitType: 'Sous-sol 1 ch.', bedrooms: 1, configuration: 'basement', averageRent: getMarketRent('basement', 1), source: 'CMHC / Rentals.ca' },
      { unitType: 'Sous-sol 2 ch.', bedrooms: 2, configuration: 'basement', averageRent: getMarketRent('basement', 2), source: 'CMHC / Rentals.ca' },
      { unitType: 'Étage sup. 3 ch.', bedrooms: 3, configuration: 'upper', averageRent: getMarketRent('upper', 3), source: 'CMHC / Rentals.ca' },
    ],
    safety: {
      crimeRate: data.crimeIndex,
      cityAverage: EDMONTON_MARKET.cityAverages.crimeRateIndex,
      predominantCrimes: data.predominantCrimes,
      trend: data.crimeTrend,
    },
    accessibility: {
      transitDistance: data.transitScore > 60 ? 'Excellent (< 500m)' : data.transitScore > 40 ? 'Bon (500m - 1km)' : 'Moyen (> 1km)',
      essentialServices: data.walkScore > 60 ? 'Proximité immédiate' : 'Distance modérée',
      walkScore: data.walkScore,
      highwayAccess: 'Accès rapide aux autoroutes principales',
    },
    overallScore,
    scoreJustification: generateScoreJustification(overallScore, data),
  };
}

function calculateNeighborhoodScore(data: ReturnType<typeof getNeighborhoodData>): number {
  let score = 5;

  // Rental market (higher renter % = better for rental investment)
  if (data.renterPercent > 50) score += 1;
  if (data.renterPercent > 65) score += 0.5;

  // Vacancy (lower = better)
  if (data.vacancyRate < 3) score += 1.5;
  else if (data.vacancyRate < 4) score += 1;
  else if (data.vacancyRate < 5) score += 0.5;
  else if (data.vacancyRate > 7) score -= 1;

  // Safety (lower crime = better)
  if (data.crimeIndex < 80) score += 1;
  else if (data.crimeIndex < 100) score += 0.5;
  else if (data.crimeIndex > 140) score -= 1;

  // Walkability
  if (data.walkScore > 70) score += 0.5;
  else if (data.walkScore < 30) score -= 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function generateScoreJustification(score: number, data: any): string {
  const parts: string[] = [];
  if (data.vacancyRate < 4) parts.push('Faible taux de vacance');
  if (data.renterPercent > 50) parts.push('Fort marché locatif');
  if (data.crimeIndex < 100) parts.push('Sécurité supérieure à la moyenne');
  if (data.walkScore > 60) parts.push('Bonne marchabilité');
  if (data.vacancyRate > 6) parts.push('Taux de vacance élevé');
  if (data.crimeIndex > 130) parts.push('Criminalité au-dessus de la moyenne');
  return parts.join('. ') || 'Quartier dans la moyenne d\'Edmonton';
}

// ── 2. Revenue Analysis ──
function analyzeRevenue(proForma: ProFormaData, neighborhood: NeighborhoodAnalysis, aiMarketRents?: Record<string, number>): RevenueAnalysis {
  const units = proForma.units.map(u => {
    // Use AI market rents if available, otherwise fall back to static data
    const marketRent = getAIMarketRent(u.configuration, u.bedrooms, aiMarketRents)
      || getMarketRent(u.configuration, u.bedrooms);
    const projectedRent = u.monthlyRent;
    const gapDollar = projectedRent - marketRent;
    const gapPercent = marketRent > 0 ? (gapDollar / marketRent) * 100 : 0;

    let alert: 'realistic' | 'optimistic' | 'high_risk' = 'realistic';
    if (gapPercent > 20) alert = 'high_risk';
    else if (gapPercent > 10) alert = 'optimistic';

    return { unitType: `${getMarketRentLabel(u.configuration, u.bedrooms)}`, projectedRent, marketRent, gapDollar, gapPercent: Math.round(gapPercent * 10) / 10, alert };
  });

  return {
    units,
    totalProjectedMonthly: units.reduce((s, u) => s + u.projectedRent, 0),
    totalMarketMonthly: units.reduce((s, u) => s + u.marketRent, 0),
  };
}

function getAIMarketRent(configuration: string, bedrooms: number, aiRents?: Record<string, number>): number | null {
  if (!aiRents) return null;

  // Try exact match first
  const key = `${configuration}_${bedrooms}br`;
  if (aiRents[key]) return aiRents[key];

  // Fallback: try matching by bedrooms only
  if (bedrooms <= 2) return aiRents[`basement_${bedrooms}br`] || null;
  if (bedrooms >= 3) return aiRents['upper_3br'] || null;

  return null;
}

// ── 3. Expense Analysis ──
function analyzeExpenses(proForma: ProFormaData, neighborhood: NeighborhoodAnalysis): ExpenseAnalysis {
  const { expenses, salePrice, totalAnnualRevenue } = proForma;
  const mins = EDMONTON_MARKET.minimums;
  const items: ExpenseAnalysis['items'] = [];

  // Property tax
  const minTax = Math.round(salePrice * mins.propertyTaxRate);
  items.push({
    category: 'Taxes foncières',
    projected: expenses.propertyTax,
    recommended: Math.max(expenses.propertyTax, minTax),
    gapDollar: Math.round(Math.max(0, minTax - expenses.propertyTax)),
    impactOnNOI: Math.round(-Math.max(0, minTax - expenses.propertyTax)),
    flag: expenses.propertyTax < minTax,
  });

  // Vacancy — use dollar amount from pro forma if available
  const projVacancyDollar = expenses.vacancyDollar > 0
    ? expenses.vacancyDollar
    : Math.round((expenses.vacancy / 100) * totalAnnualRevenue);
  const recVacancyRate = Math.max(expenses.vacancy, mins.vacancyRate, neighborhood.vacancy.currentRate);
  const recVacancyDollar = Math.round((recVacancyRate / 100) * totalAnnualRevenue);
  items.push({
    category: 'Vacance',
    projected: projVacancyDollar,
    recommended: Math.max(projVacancyDollar, recVacancyDollar),
    gapDollar: Math.round(Math.max(0, recVacancyDollar - projVacancyDollar)),
    impactOnNOI: Math.round(-Math.max(0, recVacancyDollar - projVacancyDollar)),
    flag: projVacancyDollar < recVacancyDollar,
  });

  // Insurance
  items.push({
    category: 'Assurances',
    projected: expenses.insurance,
    recommended: expenses.insurance || Math.round(salePrice * 0.004),
    gapDollar: 0,
    impactOnNOI: 0,
    flag: expenses.insurance === 0,
  });

  // Maintenance (min 5% of gross revenue)
  const minMaint = Math.round(totalAnnualRevenue * mins.maintenanceRate);
  items.push({
    category: 'Entretien et réparations',
    projected: expenses.maintenance,
    recommended: Math.max(expenses.maintenance, minMaint),
    gapDollar: Math.round(Math.max(0, minMaint - expenses.maintenance)),
    impactOnNOI: Math.round(-Math.max(0, minMaint - expenses.maintenance)),
    flag: expenses.maintenance < minMaint,
  });

  // Capital reserve (min 5% of gross revenue)
  const minCapex = Math.round(totalAnnualRevenue * mins.capitalReserveRate);
  items.push({
    category: 'Réserve pour dépenses en capital',
    projected: expenses.capitalReserve,
    recommended: Math.max(expenses.capitalReserve, minCapex),
    gapDollar: Math.round(Math.max(0, minCapex - expenses.capitalReserve)),
    impactOnNOI: Math.round(-Math.max(0, minCapex - expenses.capitalReserve)),
    flag: expenses.capitalReserve < minCapex,
  });

  // Management
  items.push({
    category: 'Gestion immobilière',
    projected: expenses.management,
    recommended: expenses.management || Math.round(totalAnnualRevenue * 0.08),
    gapDollar: 0,
    impactOnNOI: 0,
    flag: expenses.management === 0,
  });

  // Caretaker — forced to $0 (covered by higher maintenance & capital reserve)
  if (expenses.caretaker > 0) {
    items.push({
      category: 'Concierge/Gardien',
      projected: expenses.caretaker,
      recommended: 0,
      gapDollar: -expenses.caretaker,
      impactOnNOI: expenses.caretaker,
      flag: true,
    });
  }

  // Other costs — forced to $0 (covered by higher maintenance & capital reserve)
  if (expenses.other > 0) {
    items.push({
      category: 'Autres coûts',
      projected: expenses.other,
      recommended: 0,
      gapDollar: -expenses.other,
      impactOnNOI: expenses.other,
      flag: true,
    });
  }

  // Calculate totals EXCLUDING interest rate row (it's not an operating expense)
  const expenseItems = items.filter(i => i.category !== 'Taux d\'intérêt');
  const projectedTotal = expenseItems.reduce((s, i) => s + i.projected, 0);
  const recommendedTotal = expenseItems.reduce((s, i) => s + i.recommended, 0);

  return { items, projectedTotal, recommendedTotal };
}

// ── 4. Revised Pro Forma ──
function buildRevisedProForma(
  proForma: ProFormaData,
  revenue: RevenueAnalysis,
  expenses: ExpenseAnalysis,
  neighborhood: NeighborhoodAnalysis,
): RevisedProForma {
  const mins = EDMONTON_MARKET.minimums;

  // Mortgage comparison
  const originalMonthly = proForma.loan.monthlyPayment;
  const recRate = Math.max(proForma.loan.interestRate, mins.interestRate);
  const mr = (recRate / 100) / 12;
  const n = proForma.loan.amortizationYears * 12;
  const recommendedMonthly = proForma.loan.interestRate < mins.interestRate
    ? Math.round(proForma.loan.amount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) * 100) / 100
    : originalMonthly;
  const mortgageFlag = proForma.loan.interestRate < mins.interestRate;

  const mortgage = {
    originalRate: proForma.loan.interestRate,
    recommendedRate: recRate,
    originalMonthlyPayment: originalMonthly,
    recommendedMonthlyPayment: recommendedMonthly,
    monthlyDifference: Math.round((recommendedMonthly - originalMonthly) * 100) / 100,
    annualDifference: Math.round((recommendedMonthly - originalMonthly) * 12),
    flag: mortgageFlag,
  };

  const original = calculateMetrics(proForma, proForma.totalAnnualRevenue, proForma.expenses.totalAnnual);
  const adjustedAnnualRevenue = revenue.totalMarketMonthly * 12;
  const adjustedAnnualExpenses = expenses.recommendedTotal;
  const adjustedDebtService = recommendedMonthly * 12;

  const revised = calculateMetrics(proForma, adjustedAnnualRevenue, adjustedAnnualExpenses, adjustedDebtService);

  return { original, revised, adjustedRevenue: adjustedAnnualRevenue, adjustedExpenses: adjustedAnnualExpenses, mortgage };
}

function calculateMetrics(proForma: ProFormaData, annualRevenue: number, annualExpenses: number, debtService?: number): FinancialMetrics {
  const ds = debtService || proForma.loan.monthlyPayment * 12;
  const noi = annualRevenue - annualExpenses;
  const annualCashFlow = noi - ds;
  const totalInvested = proForma.downPayment + proForma.closingCosts;

  return {
    noi: Math.round(noi),
    annualCashFlow: Math.round(annualCashFlow),
    cashOnCashReturn: totalInvested > 0 ? Math.round((annualCashFlow / totalInvested) * 10000) / 100 : 0,
    capRate: proForma.salePrice > 0 ? Math.round((noi / proForma.salePrice) * 10000) / 100 : 0,
    dscr: ds > 0 ? Math.round((noi / ds) * 100) / 100 : 0,
    pricePerUnit: proForma.numberOfUnits > 0 ? Math.round(proForma.salePrice / proForma.numberOfUnits) : 0,
    operatingExpenseRatio: annualRevenue > 0 ? Math.round((annualExpenses / annualRevenue) * 10000) / 100 : 0,
  };
}

// ── 5. Investment Score ──
function scoreInvestment(
  proForma: ProFormaData,
  neighborhood: NeighborhoodAnalysis,
  revenue: RevenueAnalysis,
  expenses: ExpenseAnalysis,
  revised: RevisedProForma,
): InvestmentScore {
  const breakdown: InvestmentScore['breakdown'] = [];

  // Price per unit (30 pts)
  const ppu = revised.original.pricePerUnit;
  const ppuRating = getPricePerUnitRating(ppu);
  const ppuScore = ppu <= 250000 ? 30 : ppu <= 275000 ? 22 : ppu <= 300000 ? 12 : 4;
  breakdown.push({ category: 'Prix par unité', score: ppuScore, maxScore: 30, details: `${fmt(ppu)}/unité — ${ppuRating.label}` });

  // Neighborhood (30 pts)
  const nScore = Math.round((neighborhood.overallScore / 10) * 30);
  breakdown.push({ category: 'Qualité du quartier', score: nScore, maxScore: 30, details: `Score quartier: ${neighborhood.overallScore}/10` });

  // Financial return (30 pts)
  const cocr = revised.revised.cashOnCashReturn;
  const finScore = cocr >= 10 ? 30 : cocr >= 7 ? 24 : cocr >= 4 ? 18 : cocr >= 1 ? 10 : cocr >= 0 ? 5 : 0;
  breakdown.push({ category: 'Rendement financier ajusté', score: finScore, maxScore: 30, details: `Cash-on-cash ajusté: ${cocr}%` });

  // Revenue realism (5 pts)
  const highRiskUnits = revenue.units.filter(u => u.alert === 'high_risk').length;
  const optimisticUnits = revenue.units.filter(u => u.alert === 'optimistic').length;
  const revScore = Math.max(0, 5 - highRiskUnits * 2 - optimisticUnits * 1);
  breakdown.push({ category: 'Réalisme des revenus', score: revScore, maxScore: 5, details: `${highRiskUnits} unité(s) à risque élevé, ${optimisticUnits} optimiste(s)` });

  // Expense realism (5 pts)
  const flaggedExpenses = expenses.items.filter(i => i.flag).length;
  const expScore = Math.max(0, 5 - flaggedExpenses * 1);
  breakdown.push({ category: 'Réalisme des dépenses', score: expScore, maxScore: 5, details: `${flaggedExpenses} catégorie(s) sous-estimée(s)` });

  const total = breakdown.reduce((s, b) => s + b.score, 0);

  const recommendation = total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'medium' : 'poor';
  const labels = { excellent: 'Investissement fortement recommandé', good: 'Investissement recommandé avec réserves', medium: 'Nécessite négociation ou prudence', poor: 'Investissement déconseillé' };

  return {
    total, breakdown, recommendation,
    recommendationLabel: labels[recommendation],
    strengths: generateStrengths(proForma, neighborhood, revenue, revised),
    weaknesses: generateWeaknesses(proForma, neighborhood, revenue, expenses, revised),
    risks: generateRisks(neighborhood, revenue, expenses),
    opportunities: generateOpportunities(proForma, neighborhood, revised),
  };
}

function generateStrengths(p: ProFormaData, n: NeighborhoodAnalysis, r: RevenueAnalysis, rv: RevisedProForma): string[] {
  const s: string[] = [];
  if (rv.revised.capRate > 5) s.push(`Cap rate ajusté solide à ${rv.revised.capRate}%`);
  if (rv.revised.dscr > 1.25) s.push(`DSCR confortable à ${rv.revised.dscr}`);
  if (n.vacancy.currentRate < 4) s.push(`Faible taux de vacance dans le quartier (${n.vacancy.currentRate}%)`);
  if (n.overallScore >= 7) s.push(`Quartier de qualité (${n.overallScore}/10)`);
  if (rv.original.pricePerUnit < EDMONTON_MARKET.averagePricePerUnit) s.push('Prix par unité sous la moyenne du marché');
  if (s.length === 0) s.push('Aucun point fort majeur identifié');
  return s.slice(0, 5);
}

function generateWeaknesses(p: ProFormaData, n: NeighborhoodAnalysis, r: RevenueAnalysis, e: ExpenseAnalysis, rv: RevisedProForma): string[] {
  const w: string[] = [];
  if (r.units.some(u => u.alert === 'high_risk')) w.push('Revenus projetés très optimistes sur certaines unités');
  if (e.items.filter(i => i.flag).length > 2) w.push('Plusieurs catégories de dépenses sous-estimées');
  if (rv.revised.cashOnCashReturn < 4) w.push(`Rendement cash-on-cash ajusté faible (${rv.revised.cashOnCashReturn}%)`);
  if (n.vacancy.currentRate > 5) w.push(`Taux de vacance élevé dans le quartier (${n.vacancy.currentRate}%)`);
  if (rv.revised.dscr < 1.1) w.push(`DSCR serré (${rv.revised.dscr}) — risque de cash flow négatif`);
  if (w.length === 0) w.push('Aucune faiblesse majeure identifiée');
  return w.slice(0, 5);
}

function generateRisks(n: NeighborhoodAnalysis, r: RevenueAnalysis, e: ExpenseAnalysis): string[] {
  const risks: string[] = [];
  if (n.safety.crimeRate > 120) risks.push('Zone à criminalité élevée — impact potentiel sur la rétention des locataires');
  if (r.units.some(u => u.alert !== 'realistic')) risks.push('Écart entre loyers projetés et marché — risque de vacance prolongée');
  const rateItem = e.items.find(i => i.category === 'Taux d\'intérêt' && i.flag);
  if (rateItem) risks.push('Taux d\'intérêt utilisé inférieur au marché actuel');
  risks.push('Hausse potentielle des taux d\'intérêt au renouvellement');
  return risks.slice(0, 5);
}

function generateOpportunities(p: ProFormaData, n: NeighborhoodAnalysis, rv: RevisedProForma): string[] {
  const o: string[] = [];
  if (n.vacancy.currentRate < EDMONTON_MARKET.cityAverages.vacancyRate) o.push('Quartier en demande — potentiel d\'augmentation des loyers');
  if (rv.original.pricePerUnit > EDMONTON_MARKET.averagePricePerUnit * 1.1) o.push('Négociation du prix d\'achat possible');
  o.push('Optimisation des revenus par ajout de stationnement/buanderie');
  o.push('Réduction des dépenses par gestion directe');
  return o.slice(0, 5);
}

export function getPricePerUnitRating(ppu: number): { label: string; color: string; emoji: string } {
  if (ppu <= 250000) return { label: 'Excellent prix', color: 'text-green-600 bg-green-50', emoji: '🟢' };
  if (ppu <= 275000) return { label: 'Bon prix', color: 'text-lime-600 bg-lime-50', emoji: '🟡' };
  if (ppu <= 300000) return { label: 'Dispendieux', color: 'text-amber-600 bg-amber-50', emoji: '🟠' };
  return { label: 'Trop dispendieux', color: 'text-red-600 bg-red-50', emoji: '🔴' };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}
