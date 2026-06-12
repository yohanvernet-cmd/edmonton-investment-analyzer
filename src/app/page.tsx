'use client';

import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { LangProvider, LangToggle, useLang, useT } from '@/hooks/useLang';
import { FileUpload } from '@/components/upload/FileUpload';
import { ProgressBar } from '@/components/upload/ProgressBar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { QuickCalculator } from '@/components/calculator/QuickCalculator';

type UploadMode = 'upload' | 'calculator';

function AppContent() {
  const { step, analysis, error, reset } = useAppStore();
  const { lang } = useLang();
  const t = useT();
  const [mode, setMode] = useState<UploadMode>('upload');

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">EI</div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {lang === 'fr' ? 'Analyseur d\'Investissement Immobilier' : 'Real Estate Investment Analyzer'}
              </h1>
              <p className="text-xs text-slate-500">Edmonton, Alberta</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <span className="text-xs text-slate-400 font-mono">v3.4.1</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-8">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setMode('upload')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      mode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('Importer un pro forma', 'Upload pro forma')}
                  </button>
                  <button
                    onClick={() => setMode('calculator')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      mode === 'calculator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('Calculatrice rapide', 'Quick Calculator')}
                  </button>
                </div>
              </div>
              {mode === 'upload' ? <FileUpload /> : <QuickCalculator />}
            </div>
          )}
          {(step === 'extracting' || step === 'analyzing' || step === 'neighborhood') && <ProgressBar />}
          {step === 'error' && (
            <div className="card border-red-200 bg-red-50">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                {lang === 'fr' ? 'Erreur d\'analyse' : 'Analysis Error'}
              </h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button onClick={reset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                {lang === 'fr' ? 'Réessayer' : 'Try Again'}
              </button>
            </div>
          )}
          {step === 'complete' && analysis && <Dashboard analysis={analysis} onReset={reset} />}
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <LangProvider>
      <AppContent />
    </LangProvider>
  );
}
