import { NextRequest, NextResponse } from 'next/server';
import { excelToText } from '@/lib/parsers/excel-to-text';
import { extractWithAI, analyzeNeighborhoodWithAI, generateSmartSummary } from '@/lib/analysis/ai-engine';
import { runFullAnalysis } from '@/lib/analysis/engine';
import type { NeighborhoodAnalysis } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Clé API Gemini non configurée' }, { status: 500 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    // Step 1: Convert file to text
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

    // Step 2: AI extracts structured data from raw text
    const proForma = await extractWithAI(textContent, apiKey);

    if (!proForma.salePrice || !proForma.numberOfUnits) {
      return NextResponse.json({
        error: 'L\'IA n\'a pas pu extraire le prix de vente ou le nombre d\'unités. Vérifiez que le fichier est bien un pro forma immobilier.',
        partialData: proForma,
      }, { status: 422 });
    }

    // Step 3: AI analyzes the neighborhood (wait 2s to avoid rate limit)
    await new Promise(r => setTimeout(r, 2000));
    const aiNeighborhood = await analyzeNeighborhoodWithAI(proForma.address, apiKey);

    // Step 4: Run financial analysis using AI market rents
    const aiMarketRents = aiNeighborhood?.marketRents ? {
      basement_1br: aiNeighborhood.marketRents.basement_1br,
      basement_2br: aiNeighborhood.marketRents.basement_2br,
      upper_3br: aiNeighborhood.marketRents.upper_3br,
      main_2br: aiNeighborhood.marketRents.main_2br,
    } : undefined;
    const analysis = runFullAnalysis(proForma, aiMarketRents);

    // Override neighborhood with AI data
    analysis.neighborhood = mergeNeighborhoodData(analysis.neighborhood, aiNeighborhood);

    // Step 5: AI generates smart executive summary (wait 2s to avoid rate limit)
    await new Promise(r => setTimeout(r, 2000));
    const aiSummary = await generateSmartSummary({
      proForma,
      neighborhood: analysis.neighborhood,
      revenueAnalysis: analysis.revenueAnalysis,
      expenseAnalysis: analysis.expenseAnalysis,
      revisedProForma: analysis.revisedProForma,
    }, apiKey);

    // Override generic summary with AI insights
    if (aiSummary.strengths?.length) analysis.investmentScore.strengths = aiSummary.strengths;
    if (aiSummary.weaknesses?.length) analysis.investmentScore.weaknesses = aiSummary.weaknesses;
    if (aiSummary.risks?.length) analysis.investmentScore.risks = aiSummary.risks;
    if (aiSummary.opportunities?.length) analysis.investmentScore.opportunities = aiSummary.opportunities;

    // Add executive summary and negotiation tips to response
    (analysis as any).executiveSummary = aiSummary.executiveSummary || '';
    (analysis as any).negotiationTips = aiSummary.negotiationTips || [];

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Analysis error:', err);

    if (err.message?.includes('API key') || err.message?.includes('API_KEY')) {
      return NextResponse.json({ error: 'Clé API Gemini invalide. Vérifiez votre configuration.' }, { status: 401 });
    }
    if (err.message?.includes('JSON')) {
      return NextResponse.json({ error: 'Erreur de parsing de la réponse IA. Réessayez.' }, { status: 500 });
    }

    return NextResponse.json({ error: `Erreur d'analyse: ${err.message}` }, { status: 500 });
  }
}

function mergeNeighborhoodData(base: NeighborhoodAnalysis, ai: any): NeighborhoodAnalysis {
  if (!ai) return base;

  return {
    demographics: {
      ownerPercent: ai.demographics?.ownerPercent ?? base.demographics.ownerPercent,
      renterPercent: ai.demographics?.renterPercent ?? base.demographics.renterPercent,
      marketType: ai.demographics?.marketType ?? base.demographics.marketType,
      socioEconomic: ai.demographics?.socioEconomic ?? base.demographics.socioEconomic,
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
      transitDistance: ai.accessibility?.nearestLRT
        ? `LRT: ${ai.accessibility.nearestLRT}`
        : base.accessibility.transitDistance,
      essentialServices: ai.accessibility?.nearestGrocery
        ? `Épicerie: ${ai.accessibility.nearestGrocery}`
        : base.accessibility.essentialServices,
      walkScore: ai.accessibility?.walkScore ?? base.accessibility.walkScore,
      highwayAccess: ai.accessibility?.highwayAccess ?? base.accessibility.highwayAccess,
    },
    overallScore: ai.overallScore ?? base.overallScore,
    scoreJustification: ai.scoreJustification ?? base.scoreJustification,
  };
}
