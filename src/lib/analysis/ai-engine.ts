import type { ProFormaData } from '@/types';

const COMBINED_PROMPT = `Tu es un expert en analyse d'investissement immobilier à Edmonton, Alberta.
On te donne le contenu brut d'un pro forma immobilier. Tu dois faire 3 choses en UNE SEULE réponse JSON:

1. EXTRAIRE les données du pro forma
2. ANALYSER le quartier basé sur l'adresse
3. GÉNÉRER un résumé exécutif

RÈGLES CRITIQUES POUR L'EXTRACTION:
- Les montants sont en dollars canadiens, les loyers sont MENSUELS sauf indication contraire
- Le taux d'intérêt DOIT être en pourcentage entier (4.5 pour 4.5%, PAS 0.045)
- Pour la vacance: retourne le montant ANNUEL en $ ET le pourcentage
- Pour TOUTES les dépenses: retourne le montant ANNUEL en dollars
- UNITÉS: Extrais CHAQUE unité individuellement. Un immeuble de 8 unités = 8 entrées dans "units"
- Identifie chaque unité: sous-sol/basement, étage supérieur/upper, rez-de-chaussée/main
- Sépare les frais de stationnement et animaux des loyers de base

RÈGLES POUR LES LOYERS DU MARCHÉ:
- Base-toi sur RentFaster.ca, Rentals.ca, Zumper pour Edmonton
- Ce sont des CONSTRUCTIONS NEUVES = loyers plus élevés
- 1-2 chambres en SOUS-SOL, 3 chambres à l'ÉTAGE SUPÉRIEUR
- Le QUARTIER influence les loyers
- Fourchettes 2025-2026 pour du neuf: Basement 1BR: 1100-1400$, Basement 2BR: 1300-1600$, Upper 3BR: 2000-2400$, Main 2BR: 1400-1700$
- Un upper 3BR neuf ne devrait JAMAIS être en dessous de 2000$/mois

RÈGLES POUR LE QUARTIER:
- Identifie le quartier PRÉCIS (sub-neighborhood). Ex: 2350 Millbourne Rd = Tweddle Place (pas Mill Woods)
- Score sur 10 pour investissement locatif

Réponds UNIQUEMENT avec du JSON valide:
{
  "proForma": {
    "salePrice": number,
    "numberOfUnits": number,
    "address": "string complète",
    "neighborhood": "string — quartier PRÉCIS (sub-neighborhood)",
    "units": [{"type": "string", "bedrooms": number, "configuration": "basement"|"upper"|"main"|"unknown", "monthlyRent": number, "parkingFee": number, "petFee": number}],
    "downPayment": number|null,
    "closingCosts": number|null,
    "loan": {"amount": number|null, "interestRate": number, "amortizationYears": number, "cmhcInsurance": number|null},
    "expenses": {"propertyTax": number, "insurance": number, "maintenance": number, "management": number, "vacancyDollar": number, "vacancyPercent": number, "caretaker": number, "capitalReserve": number, "utilities": number, "other": number}
  },
  "neighborhood": {
    "neighborhoodName": "string",
    "demographics": {"ownerPercent": number, "renterPercent": number, "marketType": "string", "socioEconomic": "string", "medianHouseholdIncome": number, "edmontonMedianIncome": number},
    "vacancy": {"currentRate": number, "trend": "string", "cityAverage": 4.3},
    "marketRents": {"basement_1br": number, "basement_2br": number, "upper_3br": number, "main_2br": number},
    "safety": {"crimeIndex": number, "predominantCrimes": ["string"], "trend": "string"},
    "accessibility": {"walkScore": number, "transitScore": number, "nearestLRT": "string", "nearestGrocery": "string", "highwayAccess": "string"},
    "overallScore": number,
    "scoreJustification": "string"
  },
  "summary": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "risks": ["string"],
    "opportunities": ["string"],
    "executiveSummary": "string",
    "negotiationTips": ["string"]
  }
}`;

// ── Gemini API ──

const MODELS = ['gemini-2.5-flash'];

async function callGemini(prompt: string, userContent: string, apiKey: string): Promise<any> {
  let lastError = '';

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\n\n${userContent}` }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return JSON.parse(text);
        }

        if (res.status === 429 || res.status === 503) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 10000));
          continue;
        }

        lastError = `${model}: ${res.status}`;
        break;
      } catch (e: any) {
        lastError = `${model}: ${e.message}`;
        break;
      }
    }
  }

  throw new Error(`IA indisponible (${lastError}). Réessayez dans quelques minutes.`);
}

// ── Post-extraction fixes ──

function fixInterestRate(rate: number): number {
  if (rate > 0 && rate < 1) return rate * 100;
  return rate;
}

// ── Single combined call ──

export async function analyzeWithAI(content: string, apiKey: string): Promise<{
  proForma: ProFormaData;
  neighborhood: any;
  summary: any;
}> {
  const parsed = await callGemini(COMBINED_PROMPT, `Voici le contenu du pro forma:\n\n${content}`, apiKey);

  const pf = parsed.proForma || {};
  const units = (pf.units || []).map((u: any) => ({
    type: u.type || 'Unknown',
    bedrooms: u.bedrooms || 2,
    configuration: u.configuration || 'unknown',
    monthlyRent: u.monthlyRent || 0,
    parkingFee: u.parkingFee || 0,
    petFee: u.petFee || 0,
  }));

  const salePrice = pf.salePrice || 0;
  const cmhcInsurance = pf.loan?.cmhcInsurance || 0;
  const downPayment = pf.downPayment || salePrice * 0.2;
  const loanAmount = (salePrice - downPayment) + cmhcInsurance;
  const rate = fixInterestRate(pf.loan?.interestRate || 5);
  const amort = pf.loan?.amortizationYears || 25;
  const mr = (rate / 100) / 12;
  const n = amort * 12;
  const monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
  const totalMonthlyRevenue = units.reduce((s: number, u: any) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);
  const totalAnnualRevenue = totalMonthlyRevenue * 12;

  const exp = pf.expenses || {};
  let vacancyDollar = exp.vacancyDollar || 0;
  let vacancyPercent = exp.vacancyPercent || 0;
  if (vacancyDollar > 0 && vacancyPercent === 0 && totalAnnualRevenue > 0) {
    vacancyPercent = Math.round((vacancyDollar / totalAnnualRevenue) * 10000) / 100;
  } else if (vacancyPercent > 0 && vacancyDollar === 0) {
    vacancyDollar = Math.round((vacancyPercent / 100) * totalAnnualRevenue);
  }

  const totalExpenses = (exp.propertyTax || 0) + (exp.insurance || 0) + (exp.maintenance || 0) +
    (exp.management || 0) + (exp.caretaker || 0) + (exp.capitalReserve || 0) +
    (exp.utilities || 0) + (exp.other || 0) + vacancyDollar;

  const proForma: ProFormaData = {
    salePrice,
    numberOfUnits: pf.numberOfUnits || units.length,
    address: pf.address || 'Adresse non trouvée',
    aiNeighborhood: pf.neighborhood || undefined,
    units,
    totalMonthlyRevenue,
    totalAnnualRevenue,
    downPayment,
    closingCosts: pf.closingCosts || salePrice * 0.015,
    loan: { amount: loanAmount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100, cmhcInsurance },
    expenses: {
      propertyTax: exp.propertyTax || 0, insurance: exp.insurance || 0,
      maintenance: exp.maintenance || 0, management: exp.management || 0,
      vacancy: vacancyPercent, vacancyDollar,
      caretaker: exp.caretaker || 0, capitalReserve: exp.capitalReserve || 0,
      utilities: exp.utilities || 0, other: exp.other || 0, totalAnnual: totalExpenses,
    },
  };

  return {
    proForma,
    neighborhood: parsed.neighborhood || {},
    summary: parsed.summary || {},
  };
}
