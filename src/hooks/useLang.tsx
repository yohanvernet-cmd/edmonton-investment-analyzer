'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'fr' | 'en';

const LangContext = createContext<{ lang: Lang; toggle: () => void }>({ lang: 'fr', toggle: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  const toggle = () => setLang(l => l === 'fr' ? 'en' : 'fr');
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }

export function useT() {
  const { lang } = useLang();
  return (fr: string, en: string) => lang === 'fr' ? fr : en;
}

export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle} className="text-xs px-2 py-1 border border-slate-300 rounded-md hover:bg-slate-50 transition font-medium">
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  );
}
