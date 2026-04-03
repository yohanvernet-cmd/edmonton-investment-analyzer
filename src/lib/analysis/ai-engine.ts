import type { ProFormaData } from '@/types';

const EXTRACTION_PROMPT = `Tu es un expert en analyse d'investissement immobilier à Edmonton, Alberta.
On te donne le contenu brut d'un pro forma immobilier (extrait d'un fichier Excel ou PDF).

Extrais TOUTES les données suivantes en JSON. Si une donnée est absente, mets null.
Déduis les informations du contexte quand c'est possible (ex: si tu vois des loyers listés, compte les unités).

IMPORTANT:
- Les montants sont en dollars canadiens
- Les loyers sont MENSUELS sauf indication contraire
- Identifie chaque unité séparément avec son type (sous-sol, étage, etc.) et nombre de chambres
- Sépare les frais de stationnement et animaux des loyers de base
- Pour les dépenses, identifie si les montants sont mensuels ou annuels et convertis tout en ANNUEL

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication.

Format attendu:
{
  "salePrice": number,
  "numberOfUnits": number,
  "address": "string",
  "units": [
    {
      "type": "description de l'unité",
      "bedrooms": number,
      "configuration": "basement" | "upper" | "main" | "unknown",
      "monthlyRent": number (loyer de base seulement),
      "parkingFee": number,
      "petFee": number
    }
  ],
  "downPayment": number | null,
  "closingCosts": number | null,
  "loan": {
    "amount": number | null,
    "interestRate": number (en pourcentage, ex: 5.25),
    "amortizationYears": number
  },
  "expenses": {
    "propertyTax": number (annuel),
    "insurance": number (annuel),
    "maintenance": number (annuel),
    "management": number (annuel),
    "vacancyPercent": number (en pourcentage),
    "caretaker": number (annuel),
    "capitalReserve": number (annuel),
    "utilities": number (annuel),
    "other": number (annuel)
  }
}`;

const NEIGHBORHOOD_PROMPT = `Tu es un expert en immobilier à Edmonton, Alberta. On te donne une adresse.
Fournis une analyse détaillée du quartier pour un investisseur locatif.

Utilise tes connaissances sur Edmonton pour fournir des données RÉALISTES.
Si tu ne connais pas le quartier exact, base-toi sur le secteur général.

Réponds UNIQUEMENT avec du JSON valide:
{
  "neighborhoodName": "string",
  "demographics": {
    "ownerPercent": number,
    "renterPercent": number,
    "marketType": "Quartier de locataires" | "Quartier de propriétaires" | "Quartier mixte",
    "socioEconomic": "string"
  },
  "vacancy": {
    "currentRate": number,
    "trend": "En baisse" | "Stable" | "En hausse",
    "cityAverage": 4.3
  },
  "marketRents": {
    "basement_1br": number,
    "basement_2br": number,
    "upper_3br": number,
    "main_2br": number
  },
  "safety": {
    "crimeIndex": number (100 = moyenne Edmonton),
    "predominantCrimes": ["string"],
    "trend": "En amélioration" | "Stable" | "En détérioration"
  },
  "accessibility": {
    "walkScore": number (0-100),
    "transitScore": number (0-100),
    "nearestLRT": "string",
    "nearestGrocery": "string",
    "highwayAccess": "string"
  },
  "overallScore": number (1-10, pour investissement locatif),
  "scoreJustification": "string (2-3 phrases)"
}`;

const SUMMARY_PROMPT = `Tu es un conseiller en investissement immobilier à Edmonton.
On te donne les résultats complets d'une analyse de pro forma.

Génère un résumé exécutif intelligent et personnalisé. Sois direct et honnête.
Identifie les vrais problèmes et les vraies opportunités.

Réponds UNIQUEMENT avec du JSON valide:
{
  "strengths": ["string (max 5, spécifiques à cette propriété)"],
  "weaknesses": ["string (max 5, spécifiques)"],
  "risks": ["string (max 5)"],
  "opportunities": ["string (max 5)"],
  "executiveSummary": "string (paragraphe de 3-5 phrases, recommandation claire)",
  "negotiationTips": ["string (conseils de négociation basés sur l'analyse)"]
}`;

// ── Gemini API call ──

async function callGemini(prompt: string, userContent: string, apiKey: string): Promise<any> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n${userContent}` }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text);
}

// ── Public functions ──

export async function extractWithAI(content: string, apiKey: string): Promise<ProFormaData> {
  const parsed = await callGemini(EXTRACTION_PROMPT, `Voici le contenu du pro forma:\n\n${content}`, apiKey);

  const units = (parsed.units || []).map((u: any) => ({
    type: u.type || 'Unknown',
    bedrooms: u.bedrooms || 2,
    configuration: u.configuration || 'unknown',
    monthlyRent: u.monthlyRent || 0,
    parkingFee: u.parkingFee || 0,
    petFee: u.petFee || 0,
  }));

  const salePrice = parsed.salePrice || 0;
  const loanAmount = parsed.loan?.amount || salePrice * 0.8;
  const rate = parsed.loan?.interestRate || 5;
  const amort = parsed.loan?.amortizationYears || 25;
  const mr = (rate / 100) / 12;
  const n = amort * 12;
  const monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);

  const totalMonthlyRevenue = units.reduce((s: number, u: any) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);

  const exp = parsed.expenses || {};
  const vacancyPct = exp.vacancyPercent || 3;
  const totalExpenses = (exp.propertyTax || 0) + (exp.insurance || 0) + (exp.maintenance || 0) +
    (exp.management || 0) + (exp.caretaker || 0) + (exp.capitalReserve || 0) +
    (exp.utilities || 0) + (exp.other || 0);

  return {
    salePrice,
    numberOfUnits: parsed.numberOfUnits || units.length,
    address: parsed.address || 'Adresse non trouvée',
    units,
    totalMonthlyRevenue,
    totalAnnualRevenue: totalMonthlyRevenue * 12,
    downPayment: parsed.downPayment || salePrice * 0.2,
    closingCosts: parsed.closingCosts || salePrice * 0.015,
    loan: {
      amount: loanAmount,
      interestRate: rate,
      amortizationYears: amort,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    },
    expenses: {
      propertyTax: exp.propertyTax || 0,
      insurance: exp.insurance || 0,
      maintenance: exp.maintenance || 0,
      management: exp.management || 0,
      vacancy: vacancyPct,
      vacancyDollar: 0,
      caretaker: exp.caretaker || 0,
      capitalReserve: exp.capitalReserve || 0,
      utilities: exp.utilities || 0,
      other: exp.other || 0,
      totalAnnual: totalExpenses,
    },
  };
}

export async function analyzeNeighborhoodWithAI(address: string, apiKey: string) {
  return callGemini(NEIGHBORHOOD_PROMPT, `Adresse de la propriété: ${address}`, apiKey);
}

export async function generateSmartSummary(analysisData: any, apiKey: string) {
  return callGemini(SUMMARY_PROMPT, `Voici l'analyse complète:\n\n${JSON.stringify(analysisData, null, 2)}`, apiKey);
}
