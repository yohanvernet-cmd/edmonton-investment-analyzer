import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Analyseur d\'Investissement Immobilier — Edmonton',
  description: 'Analyse automatique de pro forma immobiliers pour Edmonton, Alberta',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">EI</div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Analyseur d&apos;Investissement Immobilier</h1>
                <p className="text-xs text-slate-500">Edmonton, Alberta</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">v2.0</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
