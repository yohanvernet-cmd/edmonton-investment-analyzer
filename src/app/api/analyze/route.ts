import { NextRequest, NextResponse } from 'next/server';
import { excelToText } from '@/lib/parsers/excel-to-text';
import { analyzeWithAI } from '@/lib/analysis/ai-engine';
import { runFullAnalysis } from '@/lib/analysis/engine';
import { findNeighborhoodFromSources } from '@/lib/data/neighborhood-rankings';
import type { NeighborhoodAnalysis } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });


    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let textContent: string;
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      textContent = excelToText(buffer);
    } else if (name.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text;
    } else {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .xlsx, .xls ou .pdf' }, { status: 400 });
    }

    if (textContent.trim().length < 50) {
      return NextResponse.json({ error: 'Le fichier semble vide ou illisible.' }, { status: 422 });
    }

    // Single AI call: extraction + neighborhood + summary
    const { proForma, neighborhood: aiNeighborhood, summary: aiSummary } = await analyzeWithAI(
      `Nom du fichier: ${file.name}\n\n${textContent}`
    );

    if (!proForma.salePrice || !proForma.numberOfUnits) {
      return NextResponse.json({
        error: 'L\'IA n\'a pas pu extraire le prix de vente ou le nombre d\'unités.',
        partialData: proForma,
      }, { status: 422 });
    }

    // Run financial analysis using AI market rents
    const aiMarketRents = aiNeighborhood?.marketRents ? {
      basement_1br: aiNeighborhood.marketRents.basement_1br,
      basement_2br: aiNeighborhood.marketRents.basement_2br,
      upper_3br: aiNeighborhood.marketRents.upper_3br,
      main_2br: aiNeighborhood.marketRents.main_2br,
    } : undefined;
    const analysis = runFullAnalysis(proForma, aiMarketRents);

    // Override neighborhood with AI data
    analysis.neighborhood = mergeNeighborhoodData(analysis.neighborhood, aiNeighborhood);

    // Look up custom neighborhood ranking
    const customRanking = findNeighborhoodFromSources(
      proForma.aiNeighborhood || '', proForma.address, textContent, file.name
    );
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

    // Override summary with AI insights
    if (aiSummary.strengths?.length) analysis.investmentScore.strengths = aiSummary.strengths;
    if (aiSummary.weaknesses?.length) analysis.investmentScore.weaknesses = aiSummary.weaknesses;
    if (aiSummary.risks?.length) analysis.investmentScore.risks = aiSummary.risks;
    if (aiSummary.opportunities?.length) analysis.investmentScore.opportunities = aiSummary.opportunities;

    (analysis as any).executiveSummary = aiSummary.executiveSummary || '';
    (analysis as any).negotiationTips = aiSummary.negotiationTips || [];
    (analysis as any).aiMarketRents = aiMarketRents;

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Analysis error:', err);
    
    if (err.message?.includes('JSON')) {
      return NextResponse.json({ error: 'Erreur de parsing de la réponse IA. Réessayez.' }, { status: 500 });
    }
    return NextResponse.json({ error: `Erreur d'analyse: ${err.message}` }, { status: 500 });
  }
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
      { unitType: 'Étage sup. 3 ch. (neuf)', bedrooms: 3, configuration: 'upper', averageRent: ai.marketRents.upper_3br || 1650, source: 'RentFaster / Rentals.ca' },
    ] : base.marketRents,
    safety: {
      crimeRate: ai.safety?.crimeIndex ?? base.safety.crimeRate,
      cityAverage: 100,
      predominantCrimes: ai.safety?.predominantCrimes ?? base.safety.predominantCrimes,
      trend: ai.safety?.trend ?? base.safety.trend,
    },
    accessibility: {
      transitDistance: ai.accessibility?.nearestLRT ? `LRT: ${ai.accessibility.nearestLRT}` : base.accessibility.transitDistance,
      essentialServices: ai.accessibility?.nearestGrocery ? `Épicerie: ${ai.accessibility.nearestGrocery}` : base.accessibility.essentialServices,
      walkScore: ai.accessibility?.walkScore ?? base.accessibility.walkScore,
      highwayAccess: ai.accessibility?.highwayAccess ?? base.accessibility.highwayAccess,
    },
    overallScore: normalizeScore(ai.overallScore) ?? base.overallScore,
    scoreJustification: ai.scoreJustification ?? base.scoreJustification,
  };
}
