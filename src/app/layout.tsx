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
        {children}
      </body>
    </html>
  );
}
