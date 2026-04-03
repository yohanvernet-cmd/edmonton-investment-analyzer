'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/hooks/useAppStore';

export function FileUpload() {
  const { setFile, setStep, setProgress, setAnalysis, setError } = useAppStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setStep('extracting');
    setProgress(10, 'Extraction des données du pro forma...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30, 'Analyse du fichier...');
      setStep('analyzing');

      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      setProgress(60, 'Analyse du quartier...');
      setStep('neighborhood');

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur inconnue');
      }

      setProgress(90, 'Génération du rapport...');
      const analysis = await res.json();
      setProgress(100, 'Analyse terminée!');

      setTimeout(() => {
        setAnalysis(analysis);
        setStep('complete');
      }, 500);
    } catch (err: any) {
      setError(err.message);
    }
  }, [setFile, setStep, setProgress, setAnalysis, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysez votre pro forma</h2>
        <p className="text-slate-600">Importez un fichier Excel ou PDF pour obtenir une analyse complète de l&apos;opportunité d&apos;investissement.</p>
      </div>

      <div
        {...getRootProps()}
        className={`card cursor-pointer border-2 border-dashed transition-all text-center py-16 ${
          isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">📊</div>
        <p className="text-lg font-medium text-slate-700 mb-1">
          {isDragActive ? 'Déposez le fichier ici...' : 'Glissez-déposez votre pro forma'}
        </p>
        <p className="text-sm text-slate-500">ou cliquez pour sélectionner un fichier</p>
        <p className="text-xs text-slate-400 mt-3">Formats acceptés: .xlsx, .xls, .pdf — Max 10 Mo</p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-600">
        {[
          ['📈', 'Analyse financière', 'NOI, Cap Rate, DSCR, Cash-on-Cash'],
          ['🏘️', 'Analyse de quartier', 'Vacance, sécurité, accessibilité'],
          ['📋', 'Pro forma révisé', 'Comparaison original vs ajusté'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="card">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-slate-400 mt-1">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
