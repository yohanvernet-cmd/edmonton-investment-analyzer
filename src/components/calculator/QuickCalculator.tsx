'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useT } from '@/hooks/useLang';
import { formatCurrency } from '@/lib/utils/format';
import { EDMONTON_MARKET } from '@/lib/data/edmonton-market';

type Overrides = Partial<{
  downPaymentPct: number;
  interestRate: number;
  amortYears: number;
  closingCostsPct: number;
  vacancyRate: number;
  propertyTax: number;
  insurance: number;
  maintenance: number;
  capitalReserve: number;
  management: number;
}>;

const DEFAULTS = {
  downPaymentPct: 20,
  interestRate: EDMONTON_MARKET.minimums.interestRate, // 4.25
  amortYears: 25,
  closingCostsPct: 1.5,
  vacancyRate: EDMONTON_MARKET.minimums.vacancyRate,   // 5
  cmhcRate: 0.058,
  propertyTaxRate: EDMONTON_MARKET.minimums.propertyTaxRate, // 0.009
  insuranceRate: 0.046,
  maintenanceRate: EDMONTON_MARKET.minimums.maintenanceRate, // 0.05
  capitalReserveRate: EDMONTON_MARKET.minimums.capitalReserveRate, // 0.05
  managementRate: 0.08,
};

export function QuickCalculator() {
  const t = useT();

  // ── Primary inputs ──
  const [salePrice, setSalePrice] = useState(1_000_000);
  const [numberOfUnits, setNumberOfUnits] = useState(4);
  const [rents, setRents] = useState<number[]>([1500, 1500, 1500, 1500]);
  const [overrides, setOverrides] = useState<Overrides>({});

  // Resize rents array when unit count changes
  useEffect(() => {
    setRents(prev => {
      if (prev.length === numberOfUnits) return prev;
      if (prev.length < numberOfUnits) {
        const fill = prev[prev.length - 1] ?? 1500;
        return [...prev, ...Array(numberOfUnits - prev.length).fill(fill)];
      }
      return prev.slice(0, numberOfUnits);
    });
  }, [numberOfUnits]);

  // ── Derived values (with overrides) ──
  const calc = useMemo(() => {
    const downPaymentPct = overrides.downPaymentPct ?? DEFAULTS.downPaymentPct;
    const interestRate = overrides.interestRate ?? DEFAULTS.interestRate;
    const amortYears = overrides.amortYears ?? DEFAULTS.amortYears;
    const closingCostsPct = overrides.closingCostsPct ?? DEFAULTS.closingCostsPct;
    const vacancyRate = overrides.vacancyRate ?? DEFAULTS.vacancyRate;

    const totalMonthlyRevenue = rents.reduce((s, r) => s + (Number.isFinite(r) ? r : 0), 0);
    const totalAnnualRevenue = totalMonthlyRevenue * 12;
    const vacancyDollar = Math.round((totalAnnualRevenue * vacancyRate) / 100);
    const egi = totalAnnualRevenue - vacancyDollar;

    const propertyTax = overrides.propertyTax ?? Math.round(salePrice * DEFAULTS.propertyTaxRate);
    const insurance = overrides.insurance ?? Math.round(egi * DEFAULTS.insuranceRate);
    const maintenance = overrides.maintenance ?? Math.round(totalAnnualRevenue * DEFAULTS.maintenanceRate);
    const capitalReserve = overrides.capitalReserve ?? Math.round(totalAnnualRevenue * DEFAULTS.capitalReserveRate);
    const management = overrides.management ?? Math.round(totalAnnualRevenue * DEFAULTS.managementRate);

    const totalOpEx = propertyTax + insurance + maintenance + capitalReserve + management;
    const noi = egi - totalOpEx;

    const downPayment = Math.round((salePrice * downPaymentPct) / 100);
    const baseLoan = Math.max(0, salePrice - downPayment);
    const cmhcInsurance = Math.round(baseLoan * DEFAULTS.cmhcRate);
    const loanAmount = baseLoan + cmhcInsurance;
    const closingCosts = Math.round((salePrice * closingCostsPct) / 100);

    const mr = interestRate / 100 / 12;
    const n = amortYears * 12;
    const mortgageFactor = mr > 0 ? (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) : 1 / n;
    const monthlyPayment = loanAmount * mortgageFactor;
    const annualDebtService = monthlyPayment * 12;

    const totalInvested = downPayment + closingCosts;
    const annualCashFlow = noi - annualDebtService;
    const capRate = salePrice > 0 ? (noi / salePrice) * 100 : 0;
    const cashOnCash = totalInvested > 0 ? (annualCashFlow / totalInvested) * 100 : 0;
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
    const pricePerUnit = numberOfUnits > 0 ? salePrice / numberOfUnits : 0;
    const oer = egi > 0 ? (totalOpEx / egi) * 100 : 0;

    function maxBuyingPrice(targetDSCR: number): number {
      if (noi <= 0 || mortgageFactor <= 0) return 0;
      const maxAnnualDS = noi / targetDSCR;
      const maxLoan = (maxAnnualDS / 12) / mortgageFactor;
      const maxBaseLoan = maxLoan / (1 + DEFAULTS.cmhcRate);
      const ltv = 1 - downPaymentPct / 100;
      return ltv > 0 ? Math.round(maxBaseLoan / ltv) : 0;
    }

    return {
      downPaymentPct, interestRate, amortYears, closingCostsPct, vacancyRate,
      totalMonthlyRevenue, totalAnnualRevenue, vacancyDollar, egi,
      propertyTax, insurance, maintenance, capitalReserve, management, totalOpEx,
      noi, downPayment, baseLoan, cmhcInsurance, loanAmount, closingCosts,
      monthlyPayment, annualDebtService, totalInvested, annualCashFlow,
      capRate, cashOnCash, dscr, pricePerUnit, oer,
      maxPrice110: maxBuyingPrice(1.10),
      maxPrice120: maxBuyingPrice(1.20),
    };
  }, [salePrice, numberOfUnits, rents, overrides]);

  function setOverride<K extends keyof Overrides>(key: K, value: Overrides[K]) {
    setOverrides(prev => ({ ...prev, [key]: value }));
  }

  function applyRentToAll(value: number) {
    setRents(Array(numberOfUnits).fill(value));
  }

  function resetAll() {
    setOverrides({});
  }

  const isOverridden = Object.keys(overrides).length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">
          {t('Calculatrice rapide', 'Quick Calculator')}
        </h2>
        <p className="text-slate-600 text-sm">
          {t(
            'Saisissez le prix et les loyers, le reste se calcule automatiquement.',
            'Enter the price and rents, everything else is auto-calculated.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: inputs ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property basics */}
          <Section title={t('Propriété', 'Property')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={t("Prix du bâtiment", 'Building Price')}
                value={salePrice}
                onChange={setSalePrice}
                prefix="$"
              />
              <Field
                label={t("Nombre d'unités (1-20)", 'Number of units (1-20)')}
                value={numberOfUnits}
                onChange={(v) => setNumberOfUnits(Math.max(1, Math.min(20, Math.round(v))))}
                min={1}
                max={20}
              />
            </div>
          </Section>

          {/* Rents per unit */}
          <Section title={t('Loyers mensuels par unité', 'Monthly rent per unit')}>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => applyRentToAll(rents[0] ?? 1500)}
                className="text-xs px-3 py-1 border border-slate-300 rounded-md hover:bg-slate-50 transition"
              >
                {t('Appliquer à tous', 'Apply to all')}
              </button>
              <span className="text-xs text-slate-500">
                {t('Total mensuel', 'Monthly total')}: <strong>{formatCurrency(calc.totalMonthlyRevenue)}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rents.map((r, i) => (
                <div key={i}>
                  <label className="text-xs text-slate-500 block mb-1">
                    {t('Unité', 'Unit')} {i + 1}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      value={r}
                      onChange={(e) => {
                        const next = [...rents];
                        next[i] = Number(e.target.value);
                        setRents(next);
                      }}
                      className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Mortgage */}
          <Section title={t('Hypothèque', 'Mortgage')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label={t('Mise de fonds (%)', 'Down payment (%)')}
                value={calc.downPaymentPct}
                onChange={(v) => setOverride('downPaymentPct', v)}
                step={0.5}
                suffix="%"
              />
              <Field
                label={t("Taux d'intérêt (%)", 'Interest rate (%)')}
                value={calc.interestRate}
                onChange={(v) => setOverride('interestRate', v)}
                step={0.25}
                suffix="%"
              />
              <Field
                label={t('Amortissement (années)', 'Amortization (years)')}
                value={calc.amortYears}
                onChange={(v) => setOverride('amortYears', Math.max(1, Math.round(v)))}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
              <ReadOnly label={t('Mise de fonds', 'Down payment')} value={formatCurrency(calc.downPayment)} />
              <ReadOnly label={t('Prêt (avec SCHL 5.8%)', 'Loan (with CMHC 5.8%)')} value={formatCurrency(calc.loanAmount)} />
              <ReadOnly label={t('Paiement mensuel', 'Monthly payment')} value={formatCurrency(calc.monthlyPayment)} />
              <ReadOnly label={t('Frais de clôture', 'Closing costs')} value={formatCurrency(calc.closingCosts)} />
            </div>
          </Section>

          {/* Expenses */}
          <Section title={t('Dépenses annuelles', 'Annual expenses')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label={t('Vacance (%)', 'Vacancy (%)')}
                value={calc.vacancyRate}
                onChange={(v) => setOverride('vacancyRate', v)}
                step={0.5}
                suffix="%"
              />
              <ReadOnly label={t('Vacance ($)', 'Vacancy ($)')} value={formatCurrency(calc.vacancyDollar)} />
              <Field
                label={t('Taxes foncières', 'Property tax')}
                value={calc.propertyTax}
                onChange={(v) => setOverride('propertyTax', v)}
                prefix="$"
              />
              <Field
                label={t('Assurances', 'Insurance')}
                value={calc.insurance}
                onChange={(v) => setOverride('insurance', v)}
                prefix="$"
              />
              <Field
                label={t('Entretien et réparations', 'Maintenance')}
                value={calc.maintenance}
                onChange={(v) => setOverride('maintenance', v)}
                prefix="$"
              />
              <Field
                label={t('Réserve capital', 'Capital reserve')}
                value={calc.capitalReserve}
                onChange={(v) => setOverride('capitalReserve', v)}
                prefix="$"
              />
              <Field
                label={t('Gestion immobilière', 'Management')}
                value={calc.management}
                onChange={(v) => setOverride('management', v)}
                prefix="$"
              />
              <ReadOnly
                label={t('Total dépenses opér.', 'Total operating expenses')}
                value={formatCurrency(calc.totalOpEx)}
              />
            </div>
          </Section>

          {isOverridden && (
            <button
              onClick={resetAll}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              {t('Réinitialiser les valeurs automatiques', 'Reset to auto-calculated values')}
            </button>
          )}
        </div>

        {/* ── Right column: metrics ── */}
        <div className="space-y-4">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-slate-900 mb-3">
              {t('Indicateurs clés', 'Key metrics')}
            </h3>
            <Metric label={t('Loyer percu', 'Rent collected')} value={formatCurrency(calc.egi)} />
            <Metric label="NOI" value={formatCurrency(calc.noi)} />
            <Metric
              label={t('Cash flow annuel', 'Annual cash flow')}
              value={formatCurrency(calc.annualCashFlow)}
              negative={calc.annualCashFlow < 0}
            />
            <Metric label="Cap rate" value={`${calc.capRate.toFixed(2)}%`} />
            <Metric
              label="Cash-on-Cash"
              value={`${calc.cashOnCash.toFixed(2)}%`}
              negative={calc.cashOnCash < 0}
            />
            <Metric
              label="DSCR"
              value={calc.dscr.toFixed(2)}
              negative={calc.dscr < 1.1}
            />
            <Metric label={t('Prix par unité', 'Price per unit')} value={formatCurrency(calc.pricePerUnit)} />
            <Metric label="OER" value={`${calc.oer.toFixed(1)}%`} />
          </div>

          <div className="card border-2 border-green-200 bg-green-50">
            <h3 className="font-bold text-green-900 mb-2">
              {t('Prix maximum à payer', 'Maximum buying price')}
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600 font-medium">DSCR 1.10</div>
                <div className="text-xl font-bold text-green-900">{formatCurrency(calc.maxPrice110)}</div>
                <div className="text-xs text-green-500 mt-1">
                  {pctVsAsking(calc.maxPrice110, salePrice, t)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-600 font-medium">DSCR 1.20 (CMHC)</div>
                <div className="text-xl font-bold text-green-900">{formatCurrency(calc.maxPrice120)}</div>
                <div className="text-xs text-green-500 mt-1">
                  {pctVsAsking(calc.maxPrice120, salePrice, t)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pctVsAsking(maxPrice: number, asking: number, t: (fr: string, en: string) => string) {
  if (asking <= 0 || maxPrice <= 0) return '';
  const diff = Math.round((1 - maxPrice / asking) * 100);
  if (diff > 0) return `-${diff}% ${t("vs prix demandé", 'vs asking')}`;
  if (diff < 0) return `+${-diff}% ${t("vs prix demandé", 'vs asking')}`;
  return t('Au prix demandé', 'At asking price');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, prefix, suffix, step, min, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1.5 text-sm text-slate-400">{prefix}</span>}
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step ?? 1}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'} py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500`}
        />
        {suffix && <span className="absolute right-3 top-1.5 text-sm text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${negative ? 'text-red-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}
