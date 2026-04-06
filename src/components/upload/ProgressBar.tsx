'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { useT } from '@/hooks/useLang';

export function ProgressBar() {
  const { progress, progressMessage } = useAppStore();
  const t = useT();

  return (
    <div className="max-w-lg mx-auto card text-center">
      <div className="text-4xl mb-4 animate-pulse">⏳</div>
      <p className="font-medium text-slate-700 mb-4">{progressMessage}</p>
      <div className="progress-bar">
        <div className="progress-bar-fill bg-brand-600" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-slate-400 mt-2">{progress}%</p>
    </div>
  );
}
