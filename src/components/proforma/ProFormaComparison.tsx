'use client';

import type { RevisedProForma } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

export function ProFormaComparison({ revised }: { revised: RevisedProForma }) {
  const o = revised.original;
  const r = revised.revised;

  const rows: { label: string; original: number; revisedVal: number; format: (v: number) => string }[] = [
    { label: 'NOI', original: o.noi, revisedVal: r.noi, format: formatCurrency },
    { label: 'Cash Flow annuel', original: o.annualCashFlow, revisedVal: r.annualCashFlow, format: formatCurrency },
    { label: 'Cap Rate', original: o.capRate, revisedVal: r.capRate, format: v => `${v}%` },
    { label: 'Cash-on-Cash Return', original: o.cashOnCashReturn, revisedVal: r.cashOnCashReturn, format: v => `${v}%` },
    { label: 'DSCR', original: o.dscr, revisedVal: r.dscr, format: v => v.toFixed(2) },
    { label: 'Ratio dépenses', original: o.operatingExpenseRatio, revisedVal: r.operatingExpenseRatio, format: v => `${v}%` },
    { label: 'Prix par unité', original: o.pricePerUnit, revisedVal: r.pricePerUnit, format: formatCurrency },
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
              return (
                <tr key={r.label} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{r.label}</td>
                  <td className="py-2 text-right font-medium">{r.format(r.original)}</td>
                  <td className="py-2 text-right font-medium">{r.format(r.revisedVal)}</td>
                  <td className={`py-2 text-right font-medium ${diff < -0.01 ? 'text-red-600' : diff > 0.01 ? 'text-green-600' : ''}`}>
                    {diff >= 0 ? '+' : ''}{r.format(diff)}
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
