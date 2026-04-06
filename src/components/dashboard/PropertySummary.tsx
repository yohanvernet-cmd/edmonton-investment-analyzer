'use client';

import type { ProFormaData, RevisedProForma } from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { getPricePerUnitRating } from '@/lib/analysis/engine';
import { useT } from '@/hooks/useLang';

export function PropertySummary({ proForma, metrics }: { proForma: ProFormaData; metrics: RevisedProForma }) {
  const t = useT();
  const ppu = metrics.original.pricePerUnit;
  const ppuRating = getPricePerUnitRating(ppu);

  const items = [
    { label: t('Prix de vente', 'Sale Price'), value: formatCurrency(proForma.salePrice) },
    { label: t('Nombre d\'unités', 'Number of Units'), value: String(proForma.numberOfUnits) },
    { label: t('Prix par unité', 'Price per Unit'), value: formatCurrency(ppu), sub: `${ppuRating.emoji} ${ppuRating.label}` },
    { label: t('Mise de fonds', 'Down Payment'), value: formatCurrency(proForma.downPayment) },
    { label: t('Prêt hypothécaire', 'Mortgage'), value: formatCurrency(proForma.loan.amount), sub: `${proForma.loan.interestRate}% / ${proForma.loan.amortizationYears} ${t('ans', 'yrs')}${proForma.loan.cmhcInsurance ? ` (incl. SCHL 5.8%: ${formatCurrency(proForma.loan.cmhcInsurance)})` : ''}` },
    { label: t('Paiement mensuel', 'Monthly Payment'), value: formatCurrency(proForma.loan.monthlyPayment) },
  ];

  const kpis = [
    { label: t('NOI (ajusté)', 'NOI (adjusted)'), value: formatCurrency(metrics.revised.noi), negative: false },
    { label: t('Cash Flow annuel', 'Annual Cash Flow'), value: formatCurrency(metrics.revised.annualCashFlow), negative: metrics.revised.annualCashFlow < 0 },
    { label: 'Cap Rate', value: `${metrics.revised.capRate}%`, negative: false },
    { label: 'Cash-on-Cash', value: `${metrics.revised.cashOnCashReturn}%`, negative: metrics.revised.cashOnCashReturn < 0 },
    { label: 'DSCR', value: metrics.revised.dscr.toFixed(2), negative: metrics.revised.dscr < 1 },
    { label: t('Ratio dépenses', 'Expense Ratio'), value: `${metrics.revised.operatingExpenseRatio}%`, negative: false },
  ];

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">{t('Résumé de la propriété', 'Property Summary')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {items.map(i => (<div key={i.label}><div className="text-xs text-slate-500">{i.label}</div><div className="text-sm font-semibold">{i.value}</div>{i.sub && <div className="text-xs text-slate-400">{i.sub}</div>}</div>))}
      </div>
      <hr className="border-slate-100 mb-4" />
      <h4 className="text-sm font-medium text-slate-700 mb-3">{t('Indicateurs clés (ajustés)', 'Key Metrics (adjusted)')}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(k => (<div key={k.label}><div className="text-xs text-slate-500">{k.label}</div><div className={`text-sm font-bold ${k.negative ? 'text-red-600' : ''}`}>{k.value}</div></div>))}
      </div>
    </div>
  );
}
