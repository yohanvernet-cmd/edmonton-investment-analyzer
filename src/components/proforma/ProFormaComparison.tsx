'use client';

import type { RevisedProForma } from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { useT } from '@/hooks/useLang';

export function ProFormaComparison({ revised }: { revised: RevisedProForma }) {
  const t = useT();
  const o = revised.original;
  const r = revised.revised;

  const rows: { label: string; original: number; revisedVal: number; format: (v: number) => string; bold?: boolean }[] = [
    { label: t('Revenu brut effectif (EGI)', 'Effective Gross Income (EGI)'), original: o.effectiveGrossIncome, revisedVal: r.effectiveGrossIncome, format: formatCurrency, bold: true },
    { label: t('Total dépenses', 'Total Expenses'), original: o.totalExpenses, revisedVal: r.totalExpenses, format: formatCurrency, bold: true },
    { label: 'NOI', original: o.noi, revisedVal: r.noi, format: formatCurrency, bold: true },
    { label: t('Cash Flow annuel', 'Annual Cash Flow'), original: o.annualCashFlow, revisedVal: r.annualCashFlow, format: formatCurrency },
    { label: 'Cap Rate', original: o.capRate, revisedVal: r.capRate, format: v => `${v}%` },
    { label: 'Cash-on-Cash Return', original: o.cashOnCashReturn, revisedVal: r.cashOnCashReturn, format: v => `${v}%` },
    { label: 'DSCR', original: o.dscr, revisedVal: r.dscr, format: v => v.toFixed(2) },
    { label: t('Ratio dépenses', 'Expense Ratio'), original: o.operatingExpenseRatio, revisedVal: r.operatingExpenseRatio, format: v => `${v}%` },
    { label: t('Prix par unité', 'Price per Unit'), original: o.pricePerUnit, revisedVal: r.pricePerUnit, format: formatCurrency },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">{t('Pro Forma: Original vs Révisé', 'Pro Forma: Original vs Revised')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200">
            <th className="text-left py-2 text-slate-500 font-medium">{t('Indicateur', 'Metric')}</th>
            <th className="text-right py-2 text-slate-500 font-medium">Original</th>
            <th className="text-right py-2 text-slate-500 font-medium">{t('Révisé', 'Revised')}</th>
            <th className="text-right py-2 text-slate-500 font-medium">{t('Écart', 'Gap')}</th>
          </tr></thead>
          <tbody>{rows.map(row => {
            const diff = row.revisedVal - row.original;
            return (<tr key={row.label} className={`border-b border-slate-50 ${row.bold ? 'bg-slate-50' : ''}`}>
              <td className={`py-2 text-slate-700 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
              <td className="py-2 text-right font-medium">{row.format(row.original)}</td>
              <td className="py-2 text-right font-medium">{row.format(row.revisedVal)}</td>
              <td className={`py-2 text-right font-medium ${diff < -0.01 ? 'text-red-600' : diff > 0.01 ? 'text-green-600' : ''}`}>{diff >= 0 ? '+' : ''}{row.format(diff)}</td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
