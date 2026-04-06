'use client';

import type { InvestmentScore } from '@/types';
import { getScoreColor, getRecommendationColor } from '@/lib/utils/format';
import { useT } from '@/hooks/useLang';

export function ScoreOverview({ score }: { score: InvestmentScore }) {
  const t = useT();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score.total / 100) * circumference;

  return (
    <div className="card flex flex-col items-center">
      <h3 className="text-sm font-medium text-slate-500 mb-4">{t('Score d\'investissement', 'Investment Score')}</h3>
      <div className="score-ring w-32 h-32 mb-4">
        <svg width="128" height="128">
          <circle cx="64" cy="64" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={getScoreColor(score.total)} />
        </svg>
        <span className={`absolute text-3xl font-bold ${getScoreColor(score.total)}`}>{score.total}</span>
      </div>
      <div className={`px-4 py-1.5 rounded-full text-sm font-medium border ${getRecommendationColor(score.recommendation)}`}>
        {score.recommendationLabel}
      </div>
      <div className="w-full mt-6 space-y-3">
        {score.breakdown.map(b => (
          <div key={b.category}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">{b.category}</span>
              <span className="font-medium">{b.score}/{b.maxScore}</span>
            </div>
            <div className="progress-bar">
              <div className={`progress-bar-fill ${b.score / b.maxScore >= 0.7 ? 'bg-green-500' : b.score / b.maxScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(b.score / b.maxScore) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
