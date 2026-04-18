'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/hooks/useAppStore';
import { useT } from '@/hooks/useLang';
import * as XLSX from 'xlsx';

const AI_API_URL = 'https://umg0ern27a.execute-api.us-east-1.amazonaws.com/prod/analyze';

function excelToText(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: 'array' });
  const lines: string[] = [];
  for (const name of wb.SheetNames) {
    lines.push('=== ' + name + ' ===');
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    for (const row of data) {
      const vals = (row as any[]).map(c => (c ?? '').toString().trim()).filter(Boolean);
      if (vals.length) lines.push(vals.join(' | '));
    }
  }
  return lines.join('\n');
}

export function FileUpload() {
  const { setFile, setStep, setProgress, setAnalysis, setError } = useAppStore();
  const t = useT();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFile(file);
    setStep('extracting');
    setProgress(10, t('Extraction des donnees du pro forma...', 'Extracting pro forma data...'));

    try {
      const buffer = await file.arrayBuffer();
      let textContent: string;

      if (file.name.toLowerCase().endsWith('.pdf')) {
        // For PDF, read as text (basic extraction)
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        textContent = decoder.decode(bytes);
        // If binary PDF, try to extract visible text
        if (textContent.includes('%PDF')) {
          const matches = textContent.match(/\(([^)]+)\)/g) || [];
          textContent = matches.map(m => m.slice(1, -1)).join(' ');
        }
      } else {
        textContent = excelToText(buffer);
      }

      if (textContent.trim().length < 50) {
        throw new Error(t('Le fichier semble vide ou illisible.', 'The file seems empty or unreadable.'));
      }

      setProgress(30, t('Analyse IA en cours (Claude via AWS Bedrock)...', 'AI analysis in progress (Claude via AWS Bedrock)...'));
      setStep('analyzing');

      // Call Lambda via API Gateway for AI analysis
      const aiRes = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Nom du fichier: ' + file.name + '\n\n' + textContent }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({ error: 'Erreur IA' }));
        throw new Error(err.error || 'Erreur IA');
      }

      const aiData = await aiRes.json();

      setProgress(60, t('Analyse du quartier...', 'Analyzing neighborhood...'));
      setStep('neighborhood');

      // Call local route for financial analysis (no Bedrock needed)
      const analysisRes = await fetch('/api/analyze-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiData, fileName: file.name, textContent }),
      });

      if (!analysisRes.ok) {
        const err = await analysisRes.json().catch(() => ({ error: 'Erreur analyse' }));
        throw new Error(err.error || 'Erreur analyse');
      }

      setProgress(90, t('Generation du rapport...', 'Generating report...'));
      const analysis = await analysisRes.json();
      setProgress(100, t('Analyse terminee!', 'Analysis complete!'));
      setTimeout(() => { setAnalysis(analysis); setStep('complete'); }, 500);
    } catch (err: any) { setError(err.message); }
  }, [setFile, setStep, setProgress, setAnalysis, setError, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'application/pdf': ['.pdf'] },
    maxFiles: 1, maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('Analysez votre pro forma', 'Analyze your pro forma')}</h2>
        <p className="text-slate-600">{t('Importez un fichier Excel ou PDF pour obtenir une analyse complete.', 'Upload an Excel or PDF file to get a complete analysis.')}</p>
      </div>
      <div {...getRootProps()} className={`card cursor-pointer border-2 border-dashed transition-all text-center py-16 ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}>
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">&#x1F4CA;</div>
        <p className="text-lg font-medium text-slate-700 mb-1">{isDragActive ? t('Deposez le fichier ici...', 'Drop the file here...') : t('Glissez-deposez votre pro forma', 'Drag & drop your pro forma')}</p>
        <p className="text-sm text-slate-500">{t('ou cliquez pour selectionner un fichier', 'or click to select a file')}</p>
        <p className="text-xs text-slate-400 mt-3">{t('Formats acceptes: .xlsx, .xls, .pdf - Max 10 Mo', 'Accepted formats: .xlsx, .xls, .pdf - Max 10 MB')}</p>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-600">
        {[
          ['\u{1F4C8}', t('Analyse financiere', 'Financial Analysis'), 'NOI, Cap Rate, DSCR, Cash-on-Cash'],
          ['\u{1F3D8}', t('Analyse de quartier', 'Neighborhood Analysis'), t('Vacance, securite, accessibilite', 'Vacancy, safety, accessibility')],
          ['\u{1F4CB}', t('Pro forma revise', 'Revised Pro Forma'), t('Comparaison original vs ajuste', 'Original vs adjusted comparison')],
        ].map(([icon, title, desc]) => (
          <div key={title} className="card"><div className="text-2xl mb-2">{icon}</div><div className="font-medium">{title}</div><div className="text-xs text-slate-400 mt-1">{desc}</div></div>
        ))}
      </div>
    </div>
  );
}
