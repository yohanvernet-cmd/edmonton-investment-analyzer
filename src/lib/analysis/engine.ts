import type {
  ProFormaData, NeighborhoodAnalysis, RevenueAnalysis, ExpenseAnalysis,
  FinancialMetrics, RevisedProForma, InvestmentScore, FullAnalysis,
} from '@/types';
import { EDMONTON_MARKET, getNeighborhoodData, getMarketRent, getMarketRentLabel } from '@/lib/data/edmonton-market';

export function runFullAnalysis(proForma: ProFormaData): FullAnalysis {
  const neighborhood = analyzeNeighborhood(proForma.address);
  const revenueAnalysis = analyzeRevenue(proForma, neighborhood);
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
function analyzeRevenue(proForma: ProFormaData, neighborhood: NeighborhoodAnalysis): RevenueAnalysis {
  const units = proForma.units.map(u => {
    const marketRent = getMarketRent(u.configuration, u.bedrooms);
    // Exclude parking and pet fees from comparison
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

// ── 3. Expense Analysis ──
function analyzeExpenses(proForma: ProFormaData, neighborhood: NeighborhoodAnalysis): ExpenseAnalysis {
  const { expenses, salePrice, totalAnnualRevenue } = proForma;
  const mins = EDMONTON_MARKET.minimums;
  const items: ExpenseAnalysis['items'] = [];

  // Interest rate check
  const recInterest = Math.max(proForma.loan.interestRate, mins.interestRate);
  if (proForma.loan.interestRate < mins.interestRate) {
    const mr = (recInterest / 100) / 12;
    const n = proForma.loan.amortizationYears * 12;
    const newPayment = proForma.loan.amount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    const diff = (newPayment - proForma.loan.monthlyPayment) * 12;
    items.push({
      category: 'Taux d\'intérêt',
      projected: proForma.loan.interestRate,
      recommended: mins.interestRate,
      gapDollar: Math.round(diff),
      impactOnNOI: Math.round(-diff),
      flag: true,
    });
  }

  // Property tax
  const minTax = salePrice * mins.propertyTaxRate;
  items.push({
    category: 'Taxes foncières',
    projected: expenses.propertyTax,
    recommended: Math.max(expenses.propertyTax, minTax),
    gapDollar: Math.round(Math.max(0, minTax - expenses.propertyTax)),
    impactOnNOI: Math.round(-Math.max(0, minTax - expenses.propertyTax)),
    flag: expenses.propertyTax < minTax,
  });

  // Vacancy
  const recVacancy = Math.max(expenses.vacancy, mins.vacancyRate, neighborhood.vacancy.currentRate);
  const projVacancyDollar = (expenses.vacancy / 100) * totalAnnualRevenue;
  const recVacancyDollar = (recVacancy / 100) * totalAnnualRevenue;
  items.push({
    category: 'Vacance',
    projected: Math.round(projVacancyDollar),
    recommended: Math.round(recVacancyDollar),
    gapDollar: Math.round(recVacancyDollar - projVacancyDollar),
    impactOnNOI: Math.round(-(recVacancyDollar - projVacancyDollar)),
    flag: expenses.vacancy < recVacancy,
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
  const minMaint = totalAnnualRevenue * mins.maintenanceRate;
  items.push({
    category: 'Entretien et réparations',
    projected: expenses.maintenance,
    recommended: Math.max(expenses.maintenance, Math.round(minMaint)),
    gapDollar: Math.round(Math.max(0, minMaint - expenses.maintenance)),
    impactOnNOI: Math.round(-Math.max(0, minMaint - expenses.maintenance)),
    flag: expenses.maintenance < minMaint,
  });

  // Capital reserve (min 5% of gross revenue)
  const minCapex = totalAnnualRevenue * mins.capitalReserveRate;
  items.push({
    category: 'Réserve pour dépenses en capital',
    projected: expenses.capitalReserve,
    recommended: Math.max(expenses.capitalReserve, Math.round(minCapex)),
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

  // Caretaker
  if (expenses.caretaker > 0 || proForma.numberOfUnits >= 4) {
    items.push({
      category: 'Concierge/Gardien',
      projected: expenses.caretaker,
      recommended: expenses.caretaker,
      gapDollar: 0,
      impactOnNOI: 0,
      flag: false,
    });
  }

  const projectedTotal = items.reduce((s, i) => s + i.projected, 0);
  const recommendedTotal = items.reduce((s, i) => s + i.recommended, 0);

  return { items, projectedTotal, recommendedTotal };
}

// ── 4. Revised Pro Forma ──
function buildRevisedProForma(
  proForma: ProFormaData,
  revenue: RevenueAnalysis,
  expenses: ExpenseAnalysis,
  neighborhood: NeighborhoodAnalysis,
): RevisedProForma {
  const original = calculateMetrics(proForma, proForma.totalAnnualRevenue, proForma.expenses.totalAnnual);

  // Adjusted revenue: use market rents
  const adjustedAnnualRevenue = revenue.totalMarketMonthly * 12;

  // Adjusted expenses: use recommended values
  const adjustedAnnualExpenses = expenses.recommendedTotal;

  // Recalculate loan payment if interest rate was adjusted
  let adjustedDebtService = proForma.loan.monthlyPayment * 12;
  const rateItem = expenses.items.find(i => i.category === 'Taux d\'intérêt');
  if (rateItem && rateItem.flag) {
    const mr = (rateItem.recommended / 100) / 12;
    const n = proForma.loan.amortizationYears * 12;
    adjustedDebtService = proForma.loan.amount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) * 12;
  }

  const revised = calculateMetrics(proForma, adjustedAnnualRevenue, adjustedAnnualExpenses, adjustedDebtService);

  return { original, revised, adjustedRevenue: adjustedAnnualRevenue, adjustedExpenses: adjustedAnnualExpenses };
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

  // Price per unit (20 pts)
  const ppu = revised.original.pricePerUnit;
  const ppuRatio = ppu / EDMONTON_MARKET.averagePricePerUnit;
  const ppuScore = ppuRatio <= 0.8 ? 20 : ppuRatio <= 1.0 ? 16 : ppuRatio <= 1.2 ? 12 : ppuRatio <= 1.5 ? 8 : 4;
  breakdown.push({ category: 'Prix par unité', score: ppuScore, maxScore: 20, details: `${fmt(ppu)}/unité vs ${fmt(EDMONTON_MARKET.averagePricePerUnit)} moyenne` });

  // Neighborhood (25 pts)
  const nScore = Math.round((neighborhood.overallScore / 10) * 25);
  breakdown.push({ category: 'Qualité du quartier', score: nScore, maxScore: 25, details: `Score quartier: ${neighborhood.overallScore}/10` });

  // Revenue realism (20 pts)
  const highRiskUnits = revenue.units.filter(u => u.alert === 'high_risk').length;
  const optimisticUnits = revenue.units.filter(u => u.alert === 'optimistic').length;
  const revScore = Math.max(0, 20 - highRiskUnits * 8 - optimisticUnits * 4);
  breakdown.push({ category: 'Réalisme des revenus', score: revScore, maxScore: 20, details: `${highRiskUnits} unité(s) à risque élevé, ${optimisticUnits} optimiste(s)` });

  // Expense realism (20 pts)
  const flaggedExpenses = expenses.items.filter(i => i.flag).length;
  const expScore = Math.max(0, 20 - flaggedExpenses * 4);
  breakdown.push({ category: 'Réalisme des dépenses', score: expScore, maxScore: 20, details: `${flaggedExpenses} catégorie(s) sous-estimée(s)` });

  // Financial return (15 pts)
  const cocr = revised.revised.cashOnCashReturn;
  const finScore = cocr >= 10 ? 15 : cocr >= 7 ? 12 : cocr >= 4 ? 9 : cocr >= 1 ? 6 : cocr >= 0 ? 3 : 0;
  breakdown.push({ category: 'Rendement financier ajusté', score: finScore, maxScore: 15, details: `Cash-on-cash ajusté: ${cocr}%` });

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

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}
