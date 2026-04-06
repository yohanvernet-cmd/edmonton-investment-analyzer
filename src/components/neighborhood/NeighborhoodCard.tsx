'use client';

import type { NeighborhoodAnalysis } from '@/types';
import { useT } from '@/hooks/useLang';

export function NeighborhoodCard({ neighborhood }: { neighborhood: NeighborhoodAnalysis }) {
  const t = useT();
  const n = neighborhood;
  const cr = n.customRanking;
  const income = n.demographics.medianIncome;
  const cityIncome = n.demographics.cityMedianIncome;
  const incomeAbove = income && cityIncome ? income >= cityIncome : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{t('Analyse du quartier', 'Neighborhood Analysis')}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{t('Score combiné:', 'Combined Score:')}</span>
          <span className={`text-lg font-bold ${n.overallScore >= 7 ? 'text-green-600' : n.overallScore >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>{n.overallScore}/10</span>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-6">{n.scoreJustification}</p>

      {cr && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-900">{t('📊 Classement personnalisé', '📊 Custom Ranking')} — {cr.name}</h4>
            <div className="flex items-center gap-3">
              <span className="text-lg">{cr.tier}</span>
              <span className="text-sm font-bold text-indigo-700">{cr.score}/10</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">#{cr.ranking} / {cr.totalNeighborhoods}</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { label: t('Appréciation loyer', 'Rent Appreciation'), key: 'RA', value: cr.ra },
              { label: t('Demande locative', 'Rental Demand'), key: 'RD', value: cr.rd },
              { label: t('Risque vacance', 'Vacancy Risk'), key: 'VR', value: cr.vr },
              { label: t('Stabilité locataire', 'Tenant Stability'), key: 'TS', value: cr.ts },
              { label: t('Revenu démogr.', 'Income Demogr.'), key: 'ID', value: cr.id },
            ].map(item => (
              <div key={item.key} className="bg-white rounded-lg p-2 border border-indigo-100">
                <div className="text-xs text-indigo-600 font-medium">{item.key}</div>
                <div className="text-lg font-bold text-indigo-900">{item.value}</div>
                <div className="text-[10px] text-indigo-400">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-indigo-400 mt-2">{t('Secteur', 'Sector')}: {cr.sector}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('👥 Profil démographique', '👥 Demographics')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            <div>Type: <span className="font-medium">{n.demographics.marketType}</span></div>
            <div>{t('Propriétaires', 'Owners')}: {n.demographics.ownerPercent}% | {t('Locataires', 'Renters')}: {n.demographics.renterPercent}%</div>
            <div>{t('Profil', 'Profile')}: {n.demographics.socioEconomic}</div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('🏠 Taux de vacance', '🏠 Vacancy Rate')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            <div>{t('Actuel', 'Current')}: <span className="font-medium">{n.vacancy.currentRate}%</span></div>
            <div>{t('Moyenne Edmonton', 'Edmonton Average')}: {n.vacancy.cityAverage}%</div>
            <div className="flex gap-2 mt-1">{n.vacancy.historicalTrend.map(tt => (<span key={tt.year} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{tt.year}: {tt.rate}%</span>))}</div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('🛡️ Sécurité', '🛡️ Safety')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            <div>{t('Indice criminalité', 'Crime Index')}: <span className={`font-medium ${n.safety.crimeRate > 120 ? 'text-red-600' : 'text-green-600'}`}>{n.safety.crimeRate}</span> ({t('moy', 'avg')}: {n.safety.cityAverage})</div>
            <div>{t('Tendance', 'Trend')}: {n.safety.trend}</div>
            <div className="text-xs text-slate-400">{n.safety.predominantCrimes.join(', ')}</div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('💵 Revenu médian', '💵 Median Income')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            {income ? (<><div>{t('Quartier', 'Neighborhood')}: <span className="font-medium">{income.toLocaleString('fr-CA')} $</span></div>{cityIncome && (<><div>Edmonton: <span className="font-medium">{cityIncome.toLocaleString('fr-CA')} $</span></div><div className={`font-medium ${incomeAbove ? 'text-green-600' : 'text-amber-600'}`}>{incomeAbove ? '↑' : '↓'} {Math.abs(Math.round(((income - cityIncome) / cityIncome) * 100))}% vs {t('moyenne Edmonton', 'Edmonton average')}</div></>)}</>) : (<div className="text-slate-400">{t('Données non disponibles', 'Data not available')}</div>)}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('💰 Loyers moyens du marché', '💰 Average Market Rents')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            {n.marketRents.map(r => (<div key={r.unitType} className="flex justify-between"><span>{r.unitType}</span><span className="font-medium">{r.averageRent} $/{t('mois', 'mo')}</span></div>))}
            <div className="text-xs text-slate-400 mt-1">Source: {n.marketRents[0]?.source}</div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">{t('🚌 Accessibilité', '🚌 Accessibility')}</h4>
          <div className="space-y-1 text-sm text-slate-600">
            <div>Transport: {n.accessibility.transitDistance}</div>
            <div>Services: {n.accessibility.essentialServices}</div>
            <div>Walk Score: <span className="font-medium">{n.accessibility.walkScore}</span></div>
            <div>{n.accessibility.highwayAccess}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
