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
      "monthlyRent": number,
      "parkingFee": number,
      "petFee": number
    }
  ],
  "downPayment": number | null,
  "closingCosts": number | null,
  "loan": {
    "amount": number | null,
    "interestRate": number,
    "amortizationYears": number
  },
  "expenses": {
    "propertyTax": number,
    "insurance": number,
    "maintenance": number,
    "management": number,
    "vacancyPercent": number,
    "caretaker": number,
    "capitalReserve": number,
    "utilities": number,
    "other": number
  }
}`;

const NEIGHBORHOOD_PROMPT = `Tu es un expert en immobilier à Edmonton, Alberta. On te donne une adresse.
Fournis une analyse détaillée du quartier pour un investisseur locatif.
Utilise tes connaissances sur Edmonton pour fournir des données RÉALISTES.

Réponds UNIQUEMENT avec du JSON valide:
{
  "neighborhoodName": "string",
  "demographics": {
    "ownerPercent": number,
    "renterPercent": number,
    "marketType": "Quartier de locataires" | "Quartier de propriétaires" | "Quartier mixte",
    "socioEconomic": "string"
  },
  "vacancy": { "currentRate": number, "trend": "string", "cityAverage": 4.3 },
  "marketRents": { "basement_1br": number, "basement_2br": number, "upper_3br": number, "main_2br": number },
  "safety": { "crimeIndex": number, "predominantCrimes": ["string"], "trend": "string" },
  "accessibility": { "walkScore": number, "transitScore": number, "nearestLRT": "string", "nearestGrocery": "string", "highwayAccess": "string" },
  "overallScore": number,
  "scoreJustification": "string"
}`;

const SUMMARY_PROMPT = `Tu es un conseiller en investissement immobilier à Edmonton.
On te donne les résultats complets d'une analyse de pro forma.
Génère un résumé exécutif intelligent et personnalisé. Sois direct et honnête.

Réponds UNIQUEMENT avec du JSON valide:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "risks": ["string"],
  "opportunities": ["string"],
  "executiveSummary": "string",
  "negotiationTips": ["string"]
}`;

// ── Gemini API ──

const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

async function callGemini(prompt: string, userContent: string, apiKey: string): Promise<any> {
  let lastError = '';

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
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

        if (res.status === 429) {
          const wait = (attempt + 1) * 16;
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }

        lastError = `${model}: ${res.status}`;
        break; // try next model
      } catch (e: any) {
        lastError = `${model}: ${e.message}`;
        break;
      }
    }
  }

  throw new Error(`IA indisponible (${lastError}). Réessayez dans quelques minutes.`);
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
    loan: { amount: loanAmount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100 },
    expenses: {
      propertyTax: exp.propertyTax || 0, insurance: exp.insurance || 0,
      maintenance: exp.maintenance || 0, management: exp.management || 0,
      vacancy: exp.vacancyPercent || 3, vacancyDollar: 0,
      caretaker: exp.caretaker || 0, capitalReserve: exp.capitalReserve || 0,
      utilities: exp.utilities || 0, other: exp.other || 0, totalAnnual: totalExpenses,
    },
  };
}

export async function analyzeNeighborhoodWithAI(address: string, apiKey: string) {
  return callGemini(NEIGHBORHOOD_PROMPT, `Adresse de la propriété: ${address}`, apiKey);
}

export async function generateSmartSummary(analysisData: any, apiKey: string) {
  return callGemini(SUMMARY_PROMPT, `Voici l'analyse complète:\n\n${JSON.stringify(analysisData, null, 2)}`, apiKey);
}
