'use client';

import type { RevisedProForma } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export function ProFormaComparison({ revised }: { revised: RevisedProForma }) {
  const rows = [
    { label: 'Revenus annuels', original: revised.original.noi + revised.original.noi - revised.original.annualCashFlow, revisedVal: revised.adjustedRevenue },
    { label: 'Dépenses annuelles', original: revised.original.noi + revised.original.noi - revised.original.annualCashFlow - revised.original.noi, revisedVal: revised.adjustedExpenses },
    { label: 'NOI', original: revised.original.noi, revisedVal: revised.revised.noi },
    { label: 'Cash Flow annuel', original: revised.original.annualCashFlow, revisedVal: revised.revised.annualCashFlow },
    { label: 'Cap Rate', original: revised.original.capRate, revisedVal: revised.revised.capRate, isPercent: true },
    { label: 'Cash-on-Cash Return', original: revised.original.cashOnCashReturn, revisedVal: revised.revised.cashOnCashReturn, isPercent: true },
    { label: 'DSCR', original: revised.original.dscr, revisedVal: revised.revised.dscr, isRatio: true },
    { label: 'Ratio dépenses', original: revised.original.operatingExpenseRatio, revisedVal: revised.revised.operatingExpenseRatio, isPercent: true },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">Pro Forma: Original vs Révisé</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-slate-500 font-medium">Indicateur</th>
              <th className="text-right py-2 text-slate-500 font-medium">Original</th>
              <th className="text-right py-2 text-slate-500 font-medium">Révisé</th>
              <th className="text-right py-2 text-slate-500 font-medium">Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const diff = r.revisedVal - r.original;
              const format = r.isPercent ? (v: number) => `${v}%` : r.isRatio ? (v: number) => v.toString() : formatCurrency;

              return (
                <tr key={r.label} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{r.label}</td>
                  <td className="py-2 text-right font-medium">{format(r.original)}</td>
                  <td className="py-2 text-right font-medium">{format(r.revisedVal)}</td>
                  <td className={`py-2 text-right font-medium ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : ''}`}>
                    {diff >= 0 ? '+' : ''}{r.isPercent || r.isRatio ? diff.toFixed(2) : formatCurrency(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
