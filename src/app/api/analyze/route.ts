import { NextRequest, NextResponse } from 'next/server';
import { parseExcel } from '@/lib/parsers/excel-parser';
import { parsePdfText } from '@/lib/parsers/pdf-parser';
import { runFullAnalysis } from '@/lib/analysis/engine';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    let proForma;
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      proForma = parseExcel(buffer);
    } else if (name.endsWith('.pdf')) {
      // Dynamic import for pdf-parse (Node.js only)
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      proForma = parsePdfText(pdfData.text);
    } else {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .xlsx, .xls ou .pdf' }, { status: 400 });
    }

    if (!proForma.salePrice || !proForma.numberOfUnits) {
      return NextResponse.json({
        error: 'Impossible d\'extraire les données essentielles du pro forma. Vérifiez que le fichier contient le prix de vente et le nombre d\'unités.',
        partialData: proForma,
      }, { status: 422 });
    }

    const analysis = runFullAnalysis(proForma);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json({ error: `Erreur d'analyse: ${err.message}` }, { status: 500 });
  }
}
