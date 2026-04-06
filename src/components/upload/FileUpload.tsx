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
    setProgress(10, t('Extraction des données du pro forma...', 'Extracting pro forma data...'));
    try {
      const formData = new FormData();
      formData.append('file', file);
      setProgress(30, t('Analyse du fichier...', 'Analyzing file...'));
      setStep('analyzing');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      setProgress(60, t('Analyse du quartier...', 'Analyzing neighborhood...'));
      setStep('neighborhood');
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Unknown error'); }
      setProgress(90, t('Génération du rapport...', 'Generating report...'));
      const analysis = await res.json();
      setProgress(100, t('Analyse terminée!', 'Analysis complete!'));
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
        <p className="text-slate-600">{t('Importez un fichier Excel ou PDF pour obtenir une analyse complète de l\'opportunité d\'investissement.', 'Upload an Excel or PDF file to get a complete investment opportunity analysis.')}</p>
      </div>
      <div {...getRootProps()} className={`card cursor-pointer border-2 border-dashed transition-all text-center py-16 ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'}`}>
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">📊</div>
        <p className="text-lg font-medium text-slate-700 mb-1">{isDragActive ? t('Déposez le fichier ici...', 'Drop the file here...') : t('Glissez-déposez votre pro forma', 'Drag & drop your pro forma')}</p>
        <p className="text-sm text-slate-500">{t('ou cliquez pour sélectionner un fichier', 'or click to select a file')}</p>
        <p className="text-xs text-slate-400 mt-3">{t('Formats acceptés: .xlsx, .xls, .pdf — Max 10 Mo', 'Accepted formats: .xlsx, .xls, .pdf — Max 10 MB')}</p>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-600">
        {[
          ['📈', t('Analyse financière', 'Financial Analysis'), 'NOI, Cap Rate, DSCR, Cash-on-Cash'],
          ['🏘️', t('Analyse de quartier', 'Neighborhood Analysis'), t('Vacance, sécurité, accessibilité', 'Vacancy, safety, accessibility')],
          ['📋', t('Pro forma révisé', 'Revised Pro Forma'), t('Comparaison original vs ajusté', 'Original vs adjusted comparison')],
        ].map(([icon, title, desc]) => (
          <div key={title} className="card"><div className="text-2xl mb-2">{icon}</div><div className="font-medium">{title}</div><div className="text-xs text-slate-400 mt-1">{desc}</div></div>
        ))}
      </div>
    </div>
  );
}
