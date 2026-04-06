'use client';

import type { InvestmentScore } from '@/types';
import { useT } from '@/hooks/useLang';

interface Props { score: InvestmentScore; executiveSummary?: string; negotiationTips?: string[]; }

export function ExecutiveSummary({ score, executiveSummary, negotiationTips }: Props) {
  const t = useT();
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">{t('Résumé exécutif', 'Executive Summary')}</h3>
      {executiveSummary && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2"><span className="text-sm">🤖</span><span className="text-xs font-medium text-slate-500">{t('Analyse IA', 'AI Analysis')}</span></div>
          <p className="text-sm text-slate-700 leading-relaxed">{executiveSummary}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title={t('✅ Points forts', '✅ Strengths')} items={score.strengths} color="text-green-700" />
        <Section title={t('⚠️ Points faibles', '⚠️ Weaknesses')} items={score.weaknesses} color="text-amber-700" />
        <Section title={t('🔴 Risques identifiés', '🔴 Identified Risks')} items={score.risks} color="text-red-700" />
        <Section title={t('💡 Opportunités', '💡 Opportunities')} items={score.opportunities} color="text-blue-700" />
      </div>
      {negotiationTips && negotiationTips.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h4 className="text-sm font-medium text-purple-700 mb-2">{t('🎯 Conseils de négociation', '🎯 Negotiation Tips')}</h4>
          <ul className="space-y-1">{negotiationTips.map((tip, i) => (<li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-purple-400">•</span>{tip}</li>))}</ul>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (<div><h4 className={`text-sm font-medium mb-2 ${color}`}>{title}</h4><ul className="space-y-1">{items.map((item, i) => (<li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-slate-400">•</span>{item}</li>))}</ul></div>);
}
