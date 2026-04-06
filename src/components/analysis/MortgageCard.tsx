'use client';

import type { MortgageComparison } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export function MortgageCard({ mortgage }: { mortgage: MortgageComparison }) {
  if (!mortgage.flag) {
    return (
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-2">Paiement hypothécaire</h3>
        <p className="text-sm text-green-600">✅ Le taux d&apos;intérêt du pro forma ({mortgage.originalRate}%) est égal ou supérieur au minimum recommandé ({mortgage.recommendedRate}%).</p>
        <div className="mt-3 text-sm">
          <span className="text-slate-500">Paiement mensuel: </span>
          <span className="font-bold">{formatCurrency(mortgage.originalMonthlyPayment)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-amber-200 bg-amber-50/30">
      <h3 className="font-semibold text-slate-900 mb-4">⚠️ Paiement hypothécaire</h3>
      <p className="text-sm text-amber-700 mb-4">
        Le taux d&apos;intérêt du pro forma ({mortgage.originalRate}%) est inférieur au minimum recommandé ({mortgage.recommendedRate}%).
        Voici l&apos;impact sur le paiement hypothécaire et le cash flow.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Pro forma ({mortgage.originalRate}%)</div>
          <div className="text-xl font-bold">{formatCurrency(mortgage.originalMonthlyPayment)}<span className="text-sm font-normal text-slate-400">/mois</span></div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-amber-300">
          <div className="text-xs text-amber-600 mb-1">Recommandé ({mortgage.recommendedRate}%)</div>
          <div className="text-xl font-bold text-amber-700">{formatCurrency(mortgage.recommendedMonthlyPayment)}<span className="text-sm font-normal text-slate-400">/mois</span></div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-slate-500">Écart mensuel</div>
          <div className="font-bold text-red-600">+{formatCurrency(mortgage.monthlyDifference)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Impact annuel sur le cash flow</div>
          <div className="font-bold text-red-600">-{formatCurrency(mortgage.annualDifference)}</div>
        </div>
      </div>
    </div>
  );
}
