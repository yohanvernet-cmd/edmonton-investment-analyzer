import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithAI } from '@/lib/analysis/ai-engine';
import { runFullAnalysis } from '@/lib/analysis/engine';
import type { ProFormaData } from '@/types';

function excelToText(buffer: Buffer): string {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];
  for (const name of wb.SheetNames) {
    lines.push('=== ' + name + ' ===');
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (const row of data as any[][]) {
      const vals = row.map((c: any) => (c ?? '').toString().trim()).filter(Boolean);
      if (vals.length) lines.push(vals.join(' | '));
    }
  }
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let textContent: string;
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) { textContent = excelToText(buffer); }
    else if (name.endsWith('.pdf')) { const pdfParse = (await import('pdf-parse')).default; textContent = (await pdfParse(buffer)).text; }
    else { return NextResponse.json({ error: 'Format non supporte' }, { status: 400 }); }
    if (textContent.trim().length < 50) return NextResponse.json({ error: 'Fichier vide' }, { status: 422 });

    const { proForma: pf, neighborhood: aiNb, summary: aiSum } = await analyzeWithAI('Nom: ' + file.name + '\n\n' + textContent);
    const units = (pf.units||[]).map((u: any) => ({ type: u.type||'?', bedrooms: u.bedrooms||2, configuration: u.configuration||'unknown', monthlyRent: u.monthlyRent||0, parkingFee: u.parkingFee||0, petFee: u.petFee||0 }));
    const salePrice = pf.salePrice||0;
    const dp = pf.downPayment||salePrice*0.2;
    const rate = (pf.loan?.interestRate > 0 && pf.loan?.interestRate < 1) ? pf.loan.interestRate*100 : (pf.loan?.interestRate||5);
    const amort = pf.loan?.amortizationYears||25;
    const cmhc = pf.loan?.cmhcInsurance||0;
    const loan = (salePrice-dp)+cmhc;
    const mr = (rate/100)/12; const n = amort*12;
    const mp = loan*(mr*Math.pow(1+mr,n))/(Math.pow(1+mr,n)-1);
    const tmr = units.reduce((s: number,u: any) => s+u.monthlyRent+u.parkingFee+u.petFee, 0);
    const tar = tmr*12;
    const exp = pf.expenses||{};
    let vd = exp.vacancyDollar||0, vp = exp.vacancyPercent||0;
    if (vd>0&&vp===0&&tar>0) vp=Math.round((vd/tar)*10000)/100;
    else if (vp>0&&vd===0) vd=Math.round((vp/100)*tar);
    const te = (exp.propertyTax||0)+(exp.insurance||0)+(exp.maintenance||0)+(exp.management||0)+(exp.caretaker||0)+(exp.capitalReserve||0)+(exp.utilities||0)+(exp.other||0)+vd;

    const proForma: ProFormaData = { salePrice, numberOfUnits: pf.numberOfUnits||units.length, address: pf.address||'', aiNeighborhood: pf.neighborhood, units, totalMonthlyRevenue: tmr, totalAnnualRevenue: tar, downPayment: dp, closingCosts: pf.closingCosts||salePrice*0.015, loan: { amount: loan, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(mp*100)/100, cmhcInsurance: cmhc }, expenses: { propertyTax: exp.propertyTax||0, insurance: exp.insurance||0, maintenance: exp.maintenance||0, management: exp.management||0, vacancy: vp, vacancyDollar: vd, caretaker: exp.caretaker||0, capitalReserve: exp.capitalReserve||0, utilities: exp.utilities||0, other: exp.other||0, totalAnnual: te } };
    const analysis = runFullAnalysis(proForma, aiNb?.marketRents);
    if (aiSum?.strengths?.length) analysis.investmentScore.strengths = aiSum.strengths;
    if (aiSum?.weaknesses?.length) analysis.investmentScore.weaknesses = aiSum.weaknesses;
    (analysis as any).executiveSummary = aiSum?.executiveSummary||'';
    (analysis as any).negotiationTips = aiSum?.negotiationTips||[];
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
