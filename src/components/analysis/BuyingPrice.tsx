'use client';

interface BuyingPriceProps {
  buyingPrice?: {
    dscr110: number;
    dscr120: number;
    currentDSCR: number;
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

  return (
    <div className="card mt-6 border-2 border-green-200 bg-green-50">
      <h3 className="text-lg font-bold text-green-900 mb-3">Maximum Buying Price</h3>
      <p className="text-sm text-green-700 mb-4">
        Maximum price you should pay to achieve the target DSCR, based on the revised NOI and current interest rate.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">DSCR 1.10 (minimum)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(buyingPrice.dscr110)}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">DSCR 1.20 (comfortable)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(buyingPrice.dscr120)}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-green-600">
        Based on: Revised NOI {fmt(buyingPrice.assumptions.noi)} | Rate {buyingPrice.assumptions.interestRate}% |{' '}
        Amort. {buyingPrice.assumptions.amortizationYears} yrs | Down payment {buyingPrice.assumptions.downPaymentPercent}%
        {buyingPrice.currentDSCR > 0 && (' | Current DSCR: ' + buyingPrice.currentDSCR.toFixed(2))}
      </div>
    </div>
  );
}
