'use client';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/hooks/useAppStore';
import { useT } from '@/hooks/useLang';

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
      const formData = new FormData();
      formData.append('file', file);
      setProgress(30, t('Analyse IA (Claude via Bedrock)...', 'AI analysis (Claude via Bedrock)...'));
      setStep('analyzing');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      setProgress(60, t('Analyse du quartier...', 'Analyzing neighborhood...'));
      setStep('neighborhood');
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur'); }
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
