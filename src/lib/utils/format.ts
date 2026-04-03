import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function getAlertColor(alert: string): string {
  switch (alert) {
    case 'high_risk': return 'text-red-600 bg-red-50';
    case 'optimistic': return 'text-amber-600 bg-amber-50';
    default: return 'text-green-600 bg-green-50';
  }
}

export function getAlertLabel(alert: string): string {
  switch (alert) {
    case 'high_risk': return 'Très optimiste — Risque élevé';
    case 'optimistic': return 'Optimiste';
    default: return 'Réaliste';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-score-excellent';
  if (score >= 60) return 'text-score-good';
  if (score >= 40) return 'text-score-medium';
  return 'text-score-poor';
}

export function getRecommendationColor(rec: string): string {
  switch (rec) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
    case 'good': return 'bg-lime-100 text-lime-800 border-lime-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default: return 'bg-red-100 text-red-800 border-red-300';
  }
}
