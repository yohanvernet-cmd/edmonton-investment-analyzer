'use client';

interface BuyingPriceProps {
  buyingPrice?: {
    dscr110: number;
    dscr120: number;
    currentDSCR: number;
    askingPrice: number;
    assumptions: {
      noi: number;
      interestRate: number;
      amortizationYears: number;
      downPaymentPercent: number;
    };
  };
}

export function BuyingPrice({ buyingPrice }: BuyingPriceProps) {
  if (!buyingPrice) return null;

  const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const discount110 = buyingPrice.askingPrice > 0 ? Math.round((1 - buyingPrice.dscr110 / buyingPrice.askingPrice) * 100) : 0;
  const discount120 = buyingPrice.askingPrice > 0 ? Math.round((1 - buyingPrice.dscr120 / buyingPrice.askingPrice) * 100) : 0;

  return (
    <div className="card mt-6 border-2 border-green-200 bg-green-50">
      <h3 className="text-lg font-bold text-green-900 mb-3">Maximum Buying Price</h3>
      <p className="text-sm text-green-700 mb-4">
        To achieve a healthy DSCR, you need to negotiate the price down from the asking price of {fmt(buyingPrice.askingPrice)}.
        Current revised DSCR: <span className="font-bold">{buyingPrice.currentDSCR.toFixed(2)}</span>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Target DSCR 1.10 (minimum)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(buyingPrice.dscr110)}</div>
          <div className="text-xs text-green-500 mt-1">{discount110 > 0 ? `-${discount110}% vs asking` : 'At or above asking'}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Target DSCR 1.20 (comfortable)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(buyingPrice.dscr120)}</div>
          <div className="text-xs text-green-500 mt-1">{discount120 > 0 ? `-${discount120}% vs asking` : 'At or above asking'}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-green-600">
        Based on: Revised NOI {fmt(buyingPrice.assumptions.noi)} | Rate {buyingPrice.assumptions.interestRate}% | Amort. {buyingPrice.assumptions.amortizationYears} yrs | Down payment {buyingPrice.assumptions.downPaymentPercent}%
      </div>
    </div>
  );
}
