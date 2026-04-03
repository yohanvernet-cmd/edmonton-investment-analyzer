'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { FileUpload } from '@/components/upload/FileUpload';
import { ProgressBar } from '@/components/upload/ProgressBar';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  const { step, analysis, error, reset } = useAppStore();

  return (
    <div className="space-y-8">
      {step === 'upload' && <FileUpload />}
      {(step === 'extracting' || step === 'analyzing' || step === 'neighborhood') && <ProgressBar />}
      {step === 'error' && (
        <div className="card border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur d&apos;analyse</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button onClick={reset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Réessayer
          </button>
        </div>
      )}
      {step === 'complete' && analysis && <Dashboard analysis={analysis} onReset={reset} />}
    </div>
  );
}
