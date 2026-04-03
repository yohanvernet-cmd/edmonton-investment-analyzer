'use client';

import type { ExpenseAnalysis } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export function ExpenseCard({ analysis }: { analysis: ExpenseAnalysis }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-1">Analyse des dépenses</h3>
      <p className="text-xs text-slate-500 mb-4">Vérification des minimums recommandés</p>

      <div className="space-y-2">
        {analysis.items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${item.flag ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              {item.flag && <span className="text-amber-500">⚠️</span>}
              <span className="text-slate-700">{item.category}</span>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-xs text-slate-400">Projeté</div>
                <div className="font-medium">{item.category === 'Taux d\'intérêt' ? `${item.projected}%` : formatCurrency(item.projected)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Recommandé</div>
                <div className="font-medium">{item.category === 'Taux d\'intérêt' ? `${item.recommended}%` : formatCurrency(item.recommended)}</div>
              </div>
              {item.gapDollar !== 0 && (
                <div>
                  <div className="text-xs text-slate-400">Impact NOI</div>
                  <div className="font-medium text-red-600">{formatCurrency(item.impactOnNOI)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-400">Total projeté</div>
          <div className="font-bold">{formatCurrency(analysis.projectedTotal)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Total recommandé</div>
          <div className="font-bold text-amber-600">{formatCurrency(analysis.recommendedTotal)}</div>
        </div>
      </div>
    </div>
  );
}
