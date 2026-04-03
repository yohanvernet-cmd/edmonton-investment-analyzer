import { create } from 'zustand';
import type { AppState } from '@/types';

export const useAppStore = create<AppState>((set) => ({
  step: 'upload',
  progress: 0,
  progressMessage: '',
  file: null,
  analysis: null,
  error: null,
  setStep: (step) => set({ step, error: step === 'error' ? undefined : null }),
  setProgress: (progress, progressMessage) => set({ progress, progressMessage }),
  setFile: (file) => set({ file }),
  setAnalysis: (analysis) => set({ analysis }),
  setError: (error) => set({ error, step: 'error' }),
  reset: () => set({ step: 'upload', progress: 0, progressMessage: '', file: null, analysis: null, error: null }),
}));
