'use client';

import type { InvestmentScore } from '@/types';

export function ExecutiveSummary({ score }: { score: InvestmentScore }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 mb-4">Résumé exécutif</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="✅ Points forts" items={score.strengths} color="text-green-700" />
        <Section title="⚠️ Points faibles" items={score.weaknesses} color="text-amber-700" />
        <Section title="🔴 Risques identifiés" items={score.risks} color="text-red-700" />
        <Section title="💡 Opportunités" items={score.opportunities} color="text-blue-700" />
      </div>
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <h4 className={`text-sm font-medium mb-2 ${color}`}>{title}</h4>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-600 flex gap-2">
            <span className="text-slate-400">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
