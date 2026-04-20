import { NextRequest, NextResponse } from 'next/server';
import { runFullAnalysis } from '@/lib/analysis/engine';
import { findNeighborhoodFromSources } from '@/lib/data/neighborhood-rankings';
import type { ProFormaData, NeighborhoodAnalysis } from '@/types';

function fixInterestRate(rate: number): number {
  if (rate > 0 && rate < 1) return rate * 100;
  return rate;
}

function normalizeScore(score: number | undefined): number | undefined {
  if (score === undefined || score === null) return undefined;
  if (score > 10) return Math.min(10, Math.round(score / 10));
  return score;
}

function mergeNeighborhoodData(base: NeighborhoodAnalysis, ai: any): NeighborhoodAnalysis {
  if (!ai) return base;
  return {
    demographics: {
      ownerPercent: ai.demographics?.ownerPercent ?? base.demographics.ownerPercent,
      renterPercent: ai.demographics?.renterPercent ?? base.demographics.renterPercent,
      marketType: ai.demographics?.marketType ?? base.demographics.marketType,
      socioEconomic: ai.demographics?.socioEconomic ?? base.demographics.socioEconomic,
      medianIncome: ai.demographics?.medianHouseholdIncome || undefined,
      cityMedianIncome: ai.demographics?.edmontonMedianIncome || undefined,
    },
    vacancy: {
      currentRate: ai.vacancy?.currentRate ?? base.vacancy.currentRate,
      historicalTrend: base.vacancy.historicalTrend,
      cityAverage: ai.vacancy?.cityAverage ?? base.vacancy.cityAverage,
    },
    marketRents: ai.marketRents ? [
      { unitType: 'Sous-sol 1 ch. (neuf)', bedrooms: 1, configuration: 'basement', averageRent: ai.marketRents.basement_1br || 950, source: 'RentFaster / Rentals.ca' },
      { unitType: 'Sous-sol 2 ch. (neuf)', bedrooms: 2, configuration: 'basement', averageRent: ai.marketRents.basement_2br || 1150, source: 'RentFaster / Rentals.ca' },
      { unitType: 'Etage sup. 3 ch. (neuf)', bedrooms: 3, configuration: 'upper', averageRent: ai.marketRents.upper_3br || 1650, source: 'RentFaster / Rentals.ca' },
    ] : base.marketRents,
    safety: {
      crimeRate: ai.safety?.crimeIndex ?? base.safety.crimeRate,
      cityAverage: 100,
      predominantCrimes: ai.safety?.predominantCrimes ?? base.safety.predominantCrimes,
      trend: ai.safety?.trend ?? base.safety.trend,
    },
    accessibility: {
      transitDistance: ai.accessibility?.nearestLRT ? `LRT: ${ai.accessibility.nearestLRT}` : base.accessibility.transitDistance,
      essentialServices: ai.accessibility?.nearestGrocery ? `Epicerie: ${ai.accessibility.nearestGrocery}` : base.accessibility.essentialServices,
      walkScore: ai.accessibility?.walkScore ?? base.accessibility.walkScore,
      highwayAccess: ai.accessibility?.highwayAccess ?? base.accessibility.highwayAccess,
    },
    overallScore: normalizeScore(ai.overallScore) ?? base.overallScore,
    scoreJustification: ai.scoreJustification ?? base.scoreJustification,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { aiData, fileName, textContent } = await req.json();
    const pf = aiData.proForma || {};
    const aiNeighborhood = aiData.neighborhood || {};
    const aiSummary = aiData.summary || {};

    const units = (pf.units || []).map((u: any) => ({
      type: u.type || 'Unknown', bedrooms: u.bedrooms || 2, configuration: u.configuration || 'unknown',
      monthlyRent: u.monthlyRent || 0, parkingFee: u.parkingFee || 0, petFee: u.petFee || 0,
    }));

    const salePrice = pf.salePrice || 0;
    const cmhcInsurance = pf.loan?.cmhcInsurance || 0;
    const downPayment = pf.downPayment || salePrice * 0.2;
    const loanAmount = (salePrice - downPayment) + cmhcInsurance;
    const rate = fixInterestRate(pf.loan?.interestRate || 5);
    const amort = pf.loan?.amortizationYears || 25;
    const mr = (rate / 100) / 12;
    const n = amort * 12;
    const monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    const totalMonthlyRevenue = units.reduce((s: number, u: any) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);
    const totalAnnualRevenue = totalMonthlyRevenue * 12;

    const exp = pf.expenses || {};
    let vacancyDollar = exp.vacancyDollar || 0;
    let vacancyPercent = exp.vacancyPercent || 0;
    if (vacancyDollar > 0 && vacancyPercent === 0 && totalAnnualRevenue > 0) {
      vacancyPercent = Math.round((vacancyDollar / totalAnnualRevenue) * 10000) / 100;
    } else if (vacancyPercent > 0 && vacancyDollar === 0) {
      vacancyDollar = Math.round((vacancyPercent / 100) * totalAnnualRevenue);
    }

    const totalExpenses = (exp.propertyTax || 0) + (exp.insurance || 0) + (exp.maintenance || 0) +
      (exp.management || 0) + (exp.caretaker || 0) + (exp.capitalReserve || 0) +
      (exp.utilities || 0) + (exp.other || 0) + vacancyDollar;

    const proForma: ProFormaData = {
      salePrice, numberOfUnits: pf.numberOfUnits || units.length,
      address: pf.address || 'Adresse non trouvee', aiNeighborhood: pf.neighborhood || undefined, units,
      totalMonthlyRevenue, totalAnnualRevenue, downPayment,
      closingCosts: pf.closingCosts || salePrice * 0.015,
      loan: { amount: loanAmount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100, cmhcInsurance },
      expenses: {
        propertyTax: exp.propertyTax || 0, insurance: exp.insurance || 0,
        maintenance: exp.maintenance || 0, management: exp.management || 0,
        vacancy: vacancyPercent, vacancyDollar,
        caretaker: exp.caretaker || 0, capitalReserve: exp.capitalReserve || 0,
        utilities: exp.utilities || 0, other: exp.other || 0, totalAnnual: totalExpenses,
      },
    };

    const aiMarketRents = aiNeighborhood?.marketRents ? {
      basement_1br: aiNeighborhood.marketRents.basement_1br,
      basement_2br: aiNeighborhood.marketRents.basement_2br,
      upper_3br: aiNeighborhood.marketRents.upper_3br,
      main_2br: aiNeighborhood.marketRents.main_2br,
    } : undefined;

    const analysis = runFullAnalysis(proForma, aiMarketRents);
    analysis.neighborhood = mergeNeighborhoodData(analysis.neighborhood, aiNeighborhood);

    const customRanking = findNeighborhoodFromSources(proForma.aiNeighborhood || '', proForma.address, textContent || '', fileName || '');
    if (customRanking) {
      analysis.neighborhood.customRanking = {
        name: customRanking.name, sector: customRanking.sector,
        ra: customRanking.ra, rd: customRanking.rd, vr: customRanking.vr,
        ts: customRanking.ts, id: customRanking.id,
        score: customRanking.score, tier: customRanking.tier,
        ranking: customRanking.ranking, totalNeighborhoods: 272,
      };
      const aiScore = analysis.neighborhood.overallScore;
      const customScore = customRanking.score;
      analysis.neighborhood.overallScore = Math.round(((aiScore + customScore) / 2) * 10) / 10;
    }

    if (aiSummary.strengths?.length) analysis.investmentScore.strengths = aiSummary.strengths;
    if (aiSummary.weaknesses?.length) analysis.investmentScore.weaknesses = aiSummary.weaknesses;
    if (aiSummary.risks?.length) analysis.investmentScore.risks = aiSummary.risks;
    if (aiSummary.opportunities?.length) analysis.investmentScore.opportunities = aiSummary.opportunities;
    (analysis as any).executiveSummary = aiSummary.executiveSummary || '';
    (analysis as any).negotiationTips = aiSummary.negotiationTips || [];
    (analysis as any).aiMarketRents = aiMarketRents;

    
    // Buying Price reverse engineering (DSCR targets)
    const noi = analysis.financials?.noi || (proForma.totalAnnualRevenue - proForma.expenses.totalAnnual);
    const interestRate = proForma.loan.interestRate;
    const amortYears = proForma.loan.amortizationYears;
    const downPaymentPercent = proForma.downPayment / (proForma.salePrice || 1);
    const mr2 = (interestRate / 100) / 12;
    const n2 = amortYears * 12;
    const mortgageFactor = mr2 > 0 ? (mr2 * Math.pow(1 + mr2, n2)) / (Math.pow(1 + mr2, n2) - 1) : 1 / n2;

    function maxPriceForDSCR(targetDSCR: number): number {
      const maxAnnualDebtService = noi / targetDSCR;
      const maxMonthlyPayment = maxAnnualDebtService / 12;
      const maxLoan = maxMonthlyPayment / mortgageFactor;
      const loanToValue = 1 - downPaymentPercent;
      return Math.round(maxLoan / loanToValue);
    }

    (analysis as any).buyingPrice = {
      dscr110: maxPriceForDSCR(1.10),
      dscr120: maxPriceForDSCR(1.20),
      currentDSCR: analysis.financials?.dscr || 0,
      assumptions: {
        noi: Math.round(noi),
        interestRate,
        amortizationYears: amortYears,
        downPaymentPercent: Math.round(downPaymentPercent * 100),
      }
    };

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Local analysis error:', err);
    return NextResponse.json({ error: `Erreur d'analyse: ${err.message}` }, { status: 500 });
  }
}
