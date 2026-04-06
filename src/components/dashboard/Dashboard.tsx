'use client';

import { useState, useCallback } from 'react';
import type { FullAnalysis, ProFormaData } from '@/types';
import { recalculate } from '@/lib/analysis/engine';
import { useT } from '@/hooks/useLang';
import { ScoreOverview } from './ScoreOverview';
import { PropertySummary } from './PropertySummary';
import { NeighborhoodCard } from '@/components/neighborhood/NeighborhoodCard';
import { RevenueCard } from '@/components/analysis/RevenueCard';
import { ExpenseCard } from '@/components/analysis/ExpenseCard';
import { MortgageCard } from '@/components/analysis/MortgageCard';
import { Simulator } from '@/components/analysis/Simulator';
import { ProFormaComparison } from '@/components/proforma/ProFormaComparison';
import { ExecutiveSummary } from './ExecutiveSummary';

interface Props {
  analysis: FullAnalysis & { executiveSummary?: string; negotiationTips?: string[] };
  onReset: () => void;
}

export function Dashboard({ analysis: initial, onReset }: Props) {
  const [analysis, setAnalysis] = useState(initial);
  const { proForma, neighborhood, revenueAnalysis, expenseAnalysis, revisedProForma, investmentScore } = analysis;
  const t = useT();

  const handleRecalculate = useCallback((updatedProForma: ProFormaData) => {
    const overrideRents: Record<string, number> = {};
    updatedProForma.units.forEach(u => { overrideRents[`${u.configuration}_${u.bedrooms}br`] = u.monthlyRent; });
    const result = recalculate(updatedProForma, analysis.neighborhood, overrideRents);
    setAnalysis(prev => ({ ...prev, ...result, timestamp: new Date().toISOString() }));
  }, [analysis.neighborhood]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('Rapport d\'analyse', 'Analysis Report')}</h2>
          <p className="text-sm text-slate-500">{proForma.address}</p>
        </div>
        <button onClick={onReset} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
          {t('Nouvelle analyse', 'New Analysis')}
        </button>
      </div>
      <Simulator analysis={analysis} onRecalculate={handleRecalculate} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreOverview score={investmentScore} />
        <div className="lg:col-span-2"><PropertySummary proForma={proForma} metrics={revisedProForma} /></div>
      </div>
      <ExecutiveSummary score={investmentScore} executiveSummary={(analysis as any).executiveSummary} negotiationTips={(analysis as any).negotiationTips} />
      <NeighborhoodCard neighborhood={neighborhood} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueCard analysis={revenueAnalysis} />
        <ExpenseCard analysis={expenseAnalysis} />
      </div>
      {revisedProForma.mortgage && <MortgageCard mortgage={revisedProForma.mortgage} />}
      <ProFormaComparison revised={revisedProForma} />
    </div>
  );
}
