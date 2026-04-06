'use client';

import type { RevenueAnalysis } from '@/types';
import { formatCurrency, getAlertColor, getAlertLabel } from '@/lib/utils/format';
import { useT } from '@/hooks/useLang';

export function RevenueCard({ analysis }: { analysis: RevenueAnalysis }) {
  const t = useT();
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-1">{t('Analyse des revenus', 'Revenue Analysis')}</h3>
      <p className="text-xs text-slate-500 mb-4">{t('Loyers projetés vs marché (excl. stationnement et animaux)', 'Projected rents vs market (excl. parking and pets)')}</p>
      <div className="space-y-3">
        {analysis.units.map((u, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">{u.unitType}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAlertColor(u.alert)}`}>{getAlertLabel(u.alert)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-slate-400">{t('Projeté', 'Projected')}</div><div className="font-medium">{formatCurrency(u.projectedRent)}</div></div>
              <div><div className="text-xs text-slate-400">{t('Marché', 'Market')}</div><div className="font-medium">{formatCurrency(u.marketRent)}</div></div>
              <div><div className="text-xs text-slate-400">{t('Écart', 'Gap')}</div><div className={`font-medium ${u.gapDollar > 0 ? 'text-amber-600' : 'text-green-600'}`}>{u.gapDollar >= 0 ? '+' : ''}{formatCurrency(u.gapDollar)} ({u.gapPercent >= 0 ? '+' : ''}{u.gapPercent}%)</div></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-xs text-slate-400">{t('Total projeté/mois', 'Total projected/mo')}</div><div className="font-bold">{formatCurrency(analysis.totalProjectedMonthly)}</div></div>
        <div><div className="text-xs text-slate-400">{t('Total marché/mois', 'Total market/mo')}</div><div className="font-bold">{formatCurrency(analysis.totalMarketMonthly)}</div></div>
      </div>
    </div>
  );
}
