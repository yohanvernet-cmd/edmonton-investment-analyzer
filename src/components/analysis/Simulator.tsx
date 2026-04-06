'use client';

import { useState } from 'react';
import type { FullAnalysis, ProFormaData } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

interface Props {
  analysis: FullAnalysis;
  onRecalculate: (proForma: ProFormaData) => void;
}

export function Simulator({ analysis, onRecalculate }: Props) {
  const pf = analysis.proForma;
  const [open, setOpen] = useState(false);
  const [salePrice, setSalePrice] = useState(pf.salePrice);
  const [interestRate, setInterestRate] = useState(pf.loan.interestRate);
  const [rents, setRents] = useState(pf.units.map(u => u.monthlyRent));
  const [downPayment, setDownPayment] = useState(pf.downPayment);

  function handleRecalculate() {
    // Recalculate CMHC premium based on LTV ratio
    const baseLoan = salePrice - downPayment;
    const ltv = baseLoan / salePrice;
    let cmhc = 0;
    if (ltv > 0.80) {
      // CMHC premium rates: 80.01-85% = 2.8%, 85.01-90% = 3.1%, 90.01-95% = 4.0%
      const cmhcRate = ltv <= 0.85 ? 0.028 : ltv <= 0.90 ? 0.031 : 0.04;
      cmhc = Math.round(baseLoan * cmhcRate);
    }
    const loanAmount = baseLoan + cmhc;
    const mr = (interestRate / 100) / 12;
    const n = pf.loan.amortizationYears * 12;
    const monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);

    const updatedUnits = pf.units.map((u, i) => ({ ...u, monthlyRent: rents[i] }));
    const totalMonthlyRevenue = updatedUnits.reduce((s, u) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);

    const updated: ProFormaData = {
      ...pf,
      salePrice,
      downPayment,
      numberOfUnits: pf.numberOfUnits,
      units: updatedUnits,
      totalMonthlyRevenue,
      totalAnnualRevenue: totalMonthlyRevenue * 12,
      loan: {
        ...pf.loan,
        amount: loanAmount,
        interestRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        cmhcInsurance: cmhc,
      },
    };
    onRecalculate(updated);
  }

  function updateRent(index: number, value: number) {
    const next = [...rents];
    next[index] = value;
    setRents(next);
  }

  return (
    <div className="card border-brand-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">🎛️ Simulateur — Ajuster les données</h3>
        <span className="text-slate-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Prix de vente" value={salePrice} onChange={setSalePrice} prefix="$" />
            <Field label="Mise de fonds" value={downPayment} onChange={setDownPayment} prefix="$" />
            <Field label="Taux d'intérêt (%)" value={interestRate} onChange={setInterestRate} step={0.25} />
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Loyers mensuels par unité</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pf.units.map((u, i) => (
                <div key={i}>
                  <label className="text-xs text-slate-500 block mb-1">{u.type.slice(0, 25)}</label>
                  <input
                    type="number"
                    value={rents[i]}
                    onChange={e => updateRent(i, Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRecalculate}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition text-sm font-medium"
          >
            Recalculer
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, prefix, step }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1.5 text-sm text-slate-400">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step || 1}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`}
        />
      </div>
    </div>
  );
}
