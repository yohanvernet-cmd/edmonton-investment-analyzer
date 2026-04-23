'use client';

import { useMemo } from 'react';
import type { RevisedProForma, ProFormaData } from '@/types';

interface BuyingPriceProps {
  revisedProForma: RevisedProForma;
  proForma: ProFormaData;
}

export function BuyingPrice({ revisedProForma, proForma }: BuyingPriceProps) {
  const result = useMemo(() => {
    const noi = revisedProForma?.revised?.noi || 0;
    const currentDSCR = revisedProForma?.revised?.dscr || 0;
    const askingPrice = proForma.salePrice;

    // Use the SAME debt service that was used to compute the revised DSCR
    // This ensures consistency: DSCR = NOI / DebtService
    const currentDebtService = revisedProForma?.mortgage?.recommendedMonthlyPayment
      ? revisedProForma.mortgage.recommendedMonthlyPayment * 12
      : proForma.loan.monthlyPayment * 12;

    // Get mortgage parameters from the revised pro forma (same as DSCR calculation)
    const rate = revisedProForma?.mortgage?.recommendedRate || proForma.loan.interestRate;
    const amort = proForma.loan.amortizationYears;
    const dpPercent = proForma.downPayment / (askingPrice || 1);

    const monthlyRate = (rate / 100) / 12;
    const numPayments = amort * 12;
    const paymentFactor = monthlyRate > 0
      ? (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 1 / numPayments;

    // Derive max price by scaling the current loan proportionally
    // Current loan = askingPrice * (1 - dpPercent)
    // Current annual debt service = currentDebtService
    // For target DSCR: maxAnnualDS = NOI / targetDSCR
    // Scale factor = maxAnnualDS / currentDebtService
    // Max price = askingPrice * scaleFactor
    function maxPrice(targetDSCR: number): number {
      if (noi <= 0 || currentDebtService <= 0) return 0;
      const maxAnnualDS = noi / targetDSCR;
      const scaleFactor = maxAnnualDS / currentDebtService;
      return Math.round(askingPrice * scaleFactor);
    }

    return {
      dscr110: maxPrice(1.10),
      dscr120: maxPrice(1.20),
      currentDSCR,
      askingPrice,
      noi: Math.round(noi),
      rate,
      amort,
      dpPercent: Math.round(dpPercent * 100),
    };
  }, [revisedProForma, proForma]);

  if (!result.noi) return null;

  const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const discount110 = result.askingPrice > 0 ? Math.round((1 - result.dscr110 / result.askingPrice) * 100) : 0;
  const discount120 = result.askingPrice > 0 ? Math.round((1 - result.dscr120 / result.askingPrice) * 100) : 0;

  return (
    <div className="card mt-6 border-2 border-green-200 bg-green-50">
      <h3 className="text-lg font-bold text-green-900 mb-3">Maximum Buying Price</h3>
      <p className="text-sm text-green-700 mb-4">
        To achieve a healthy DSCR, negotiate down from {fmt(result.askingPrice)}.
        Current revised DSCR: <span className="font-bold">{result.currentDSCR.toFixed(2)}</span>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Target DSCR 1.10 (minimum)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(result.dscr110)}</div>
          <div className="text-xs text-green-500 mt-1">{discount110 > 0 ? `-${discount110}% vs asking` : 'At or above asking'}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Target DSCR 1.20 (comfortable)</div>
          <div className="text-2xl font-bold text-green-900">{fmt(result.dscr120)}</div>
          <div className="text-xs text-green-500 mt-1">{discount120 > 0 ? `-${discount120}% vs asking` : 'At or above asking'}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-green-600">
        Based on: Revised NOI {fmt(result.noi)} | Rate {result.rate}% | Amort. {result.amort} yrs | Down payment {result.dpPercent}%
      </div>
    </div>
  );
}