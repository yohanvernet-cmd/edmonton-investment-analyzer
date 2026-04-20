'use client';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/hooks/useAppStore';
import { useT } from '@/hooks/useLang';
import { invokeLambda } from '@/lib/aws-auth';
import * as XLSX from 'xlsx';

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
    setProgress(10, t('Extraction...', 'Extracting...'));
    try {
      const buffer = await file.arrayBuffer();
      let textContent: string;
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const bytes = new Uint8Array(buffer);
        textContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (textContent.includes('%PDF')) {
          const m = textContent.match(/\(([^)]+)\)/g) || [];
          textContent = m.map(x => x.slice(1,-1)).join(' ');
        }
      } else {
        textContent = excelToText(buffer);
      }
      if (textContent.trim().length < 50) throw new Error('Fichier vide ou illisible');

      setProgress(30, t('Analyse IA (Claude via Bedrock)...', 'AI analysis (Claude via Bedrock)...'));
      setStep('analyzing');

      const aiData = await invokeLambda('Nom du fichier: ' + file.name + '\n\n' + textContent);

      setProgress(60, t('Calculs financiers...', 'Financial calculations...'));
      setStep('neighborhood');

      // Call local route for financial analysis
      const res = await fetch('/api/analyze-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiData, fileName: file.name, textContent }),
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Erreur'); }

      setProgress(90, t('Rapport...', 'Report...'));
      const analysis = await res.json();
      setProgress(100, t('Termine!', 'Done!'));
      setTimeout(() => { setAnalysis(analysis); setStep('complete'); }, 500);
    } catch (err: any) { setError(err.message); }
  }, [setFile, setStep, setProgress, setAnalysis, setError, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'application/pdf': ['.pdf'] }, maxFiles: 1, maxSize: 10*1024*1024 });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('Analysez votre pro forma', 'Analyze your pro forma')}</h2>
        <p className="text-slate-600">{t('Importez un fichier Excel ou PDF.', 'Upload an Excel or PDF file.')}</p>
      </div>
      <div {...getRootProps()} className={`card cursor-pointer border-2 border-dashed transition-all text-center py-16 ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}>
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">&#x1F4CA;</div>
        <p className="text-lg font-medium text-slate-700 mb-1">{isDragActive ? t('Deposez ici...', 'Drop here...') : t('Glissez-deposez votre pro forma', 'Drag & drop your pro forma')}</p>
        <p className="text-sm text-slate-500">{t('ou cliquez', 'or click')}</p>
        <p className="text-xs text-slate-400 mt-3">.xlsx, .xls, .pdf - Max 10 MB</p>
      </div>
    </div>
  );
}
