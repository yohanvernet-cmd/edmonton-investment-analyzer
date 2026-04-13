'use client';

import type { ExpenseAnalysis } from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { useT } from '@/hooks/useLang';

export function ExpenseCard({ analysis }: { analysis: ExpenseAnalysis }) {
  const t = useT();
  const v = analysis.vacancy;

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-1">{t('Analyse des dépenses', 'Expense Analysis')}</h3>
      <p className="text-xs text-slate-500 mb-4">{t('Vérification des minimums recommandés', 'Recommended minimums verification')}</p>

      {/* Vacancy — separate section */}
      <div className={`p-3 rounded-lg mb-4 ${v.flag ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-slate-700">{t('🏠 Vacance (séparé des dépenses)', '🏠 Vacancy (separate from expenses)')}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">{t('Projeté', 'Projected')}</div>
            <div className="font-medium">{formatCurrency(v.projected)} <span className="text-xs text-slate-400">({v.projectedRate}%)</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('Recommandé', 'Recommended')}</div>
            <div className="font-medium">{formatCurrency(v.recommended)} <span className="text-xs text-slate-400">({v.recommendedRate}%)</span></div>
          </div>
        </div>
      </div>

      {/* Operating expenses */}
      <div className="space-y-2">
        {analysis.items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${item.flag ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              {item.flag && <span className="text-amber-500">⚠️</span>}
              <span className="text-slate-700">{item.category}</span>
            </div>
            <div className="flex gap-4 text-right">
              <div><div className="text-xs text-slate-400">{t('Projeté', 'Projected')}</div><div className="font-medium">{formatCurrency(item.projected)}</div></div>
              <div><div className="text-xs text-slate-400">{t('Recommandé', 'Recommended')}</div><div className="font-medium">{formatCurrency(item.recommended)}</div></div>
              {item.gapDollar !== 0 && (<div><div className="text-xs text-slate-400">{t('Impact NOI', 'NOI Impact')}</div><div className="font-medium text-red-600">{formatCurrency(item.impactOnNOI)}</div></div>)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-xs text-slate-400">{t('Total dépenses projeté', 'Total projected expenses')}</div><div className="font-bold">{formatCurrency(analysis.projectedTotal)}</div></div>
        <div><div className="text-xs text-slate-400">{t('Total dépenses recommandé', 'Total recommended expenses')}</div><div className="font-bold text-amber-600">{formatCurrency(analysis.recommendedTotal)}</div></div>
      </div>
    </div>
  );
}
