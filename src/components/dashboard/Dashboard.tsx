'use client';

import type { FullAnalysis } from '@/types';
import { ScoreOverview } from './ScoreOverview';
import { PropertySummary } from './PropertySummary';
import { NeighborhoodCard } from '@/components/neighborhood/NeighborhoodCard';
import { RevenueCard } from '@/components/analysis/RevenueCard';
import { ExpenseCard } from '@/components/analysis/ExpenseCard';
import { ProFormaComparison } from '@/components/proforma/ProFormaComparison';
import { ExecutiveSummary } from './ExecutiveSummary';

interface Props {
  analysis: FullAnalysis & { executiveSummary?: string; negotiationTips?: string[] };
  onReset: () => void;
}

export function Dashboard({ analysis, onReset }: Props) {
  const { proForma, neighborhood, revenueAnalysis, expenseAnalysis, revisedProForma, investmentScore } = analysis;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Rapport d&apos;analyse</h2>
          <p className="text-sm text-slate-500">{proForma.address}</p>
        </div>
        <button onClick={onReset} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
          Nouvelle analyse
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreOverview score={investmentScore} />
        <div className="lg:col-span-2">
          <PropertySummary proForma={proForma} metrics={revisedProForma} />
        </div>
      </div>

      <ExecutiveSummary
        score={investmentScore}
        executiveSummary={analysis.executiveSummary}
        negotiationTips={analysis.negotiationTips}
      />

      <NeighborhoodCard neighborhood={neighborhood} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueCard analysis={revenueAnalysis} />
        <ExpenseCard analysis={expenseAnalysis} />
      </div>

      <ProFormaComparison revised={revisedProForma} />
    </div>
  );
}
