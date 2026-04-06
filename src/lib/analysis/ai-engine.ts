import type { ProFormaData } from '@/types';

const EXTRACTION_PROMPT = `Tu es un expert en analyse d'investissement immobilier à Edmonton, Alberta.
On te donne le contenu brut d'un pro forma immobilier (extrait d'un fichier Excel ou PDF).

Extrais TOUTES les données suivantes en JSON. Si une donnée est absente, mets null.
Déduis les informations du contexte quand c'est possible.

RÈGLES CRITIQUES:
- Les montants sont en dollars canadiens
- Les loyers sont MENSUELS sauf indication contraire
- Le taux d'intérêt DOIT être en pourcentage entier (ex: 4.5 pour 4.5%, PAS 0.045). Si tu vois 0.04 ou 0.045, c'est 4% ou 4.5%.
- Pour la vacance (vacancy): elle peut être exprimée en DOLLARS ANNUELS ou en POURCENTAGE. Retourne LES DEUX si possible.
- Pour TOUTES les dépenses: retourne le montant ANNUEL en dollars. Si le pro forma donne un montant mensuel, multiplie par 12.
- Si une dépense est exprimée en pourcentage, convertis-la en dollars en utilisant le revenu brut annuel.
- UNITÉS: Tu DOIS extraire CHAQUE unité individuellement. Un immeuble de 8 unités doit avoir 8 entrées dans le tableau "units". Cherche toutes les lignes qui mentionnent un loyer, un appartement, une suite, un unit, un logement. Ne regroupe JAMAIS les unités.
- Identifie chaque unité séparément avec son type (sous-sol/basement, étage supérieur/upper, rez-de-chaussée/main)
- Sépare les frais de stationnement et animaux des loyers de base
- Le nombre de chambres (bedrooms) doit être un entier (1, 2, 3, etc.)
- Si le document indique "numberOfUnits" ou un nombre total d'unités, assure-toi que le tableau "units" contient EXACTEMENT ce nombre d'entrées.

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication.

{
  "salePrice": number,
  "numberOfUnits": number,
  "address": "string complète incluant ville et province",
  "neighborhood": "string — le quartier PRÉCIS (sub-neighborhood) d'Edmonton où se trouve cette adresse. Utilise tes connaissances de Google Maps / Edmonton neighborhoods. Par exemple pour 2350 Millbourne Rd le quartier précis est Tweddle Place (pas Mill Woods qui est trop large). Cherche toujours le quartier le plus petit et précis possible.",
  "units": [
    {
      "type": "description lisible de l'unité",
      "bedrooms": number,
      "configuration": "basement" | "upper" | "main" | "unknown",
      "monthlyRent": number (loyer de base MENSUEL seulement),
      "parkingFee": number (MENSUEL),
      "petFee": number (MENSUEL)
    }
  ],
  "downPayment": number | null,
  "closingCosts": number | null,
  "loan": {
    "amount": number | null,
    "interestRate": number (EN POURCENTAGE: 4.5 signifie 4.5%, JAMAIS 0.045),
    "amortizationYears": number,
    "cmhcInsurance": number | null (CMHC insurance premium / CMHC premium / assurance SCHL, en $)
  },
  "expenses": {
    "propertyTax": number (ANNUEL en $),
    "insurance": number (ANNUEL en $),
    "maintenance": number (ANNUEL en $),
    "management": number (ANNUEL en $),
    "vacancyDollar": number (ANNUEL en $ tel qu'indiqué dans le pro forma),
    "vacancyPercent": number (en pourcentage si indiqué, sinon calcule: vacancyDollar / revenu brut annuel * 100),
    "caretaker": number (ANNUEL en $),
    "capitalReserve": number (ANNUEL en $),
    "utilities": number (ANNUEL en $),
    "other": number (ANNUEL en $ - inclure toutes les autres dépenses opérationnelles)
  }
}`;

const NEIGHBORHOOD_PROMPT = `Tu es un expert en immobilier locatif à Edmonton, Alberta. On te donne une adresse.
Fournis une analyse détaillée du quartier pour un investisseur locatif.

POUR LES LOYERS DU MARCHÉ — C'EST CRITIQUE:
- Base-toi sur les prix actuels de RentFaster.ca, Rentals.ca, Zumper et Kijiji pour Edmonton
- Ce sont des CONSTRUCTIONS NEUVES (new builds), donc les loyers sont PLUS ÉLEVÉS que la moyenne
- Les 1-2 chambres sont en SOUS-SOL (basement suites) — légèrement moins cher qu'un appartement standard mais c'est du neuf donc bien fini
- Les 3 chambres sont à l'ÉTAGE SUPÉRIEUR (upper level) — plus cher car plus grand et meilleur étage
- Le QUARTIER influence les loyers: un bon quartier = loyers plus élevés
- Donne des loyers RÉALISTES pour du neuf dans CE quartier spécifique, pas la moyenne générale d'Edmonton
- En 2025-2026 à Edmonton, pour des CONSTRUCTIONS NEUVES, les loyers typiques sont:
  * Basement 1BR neuf: 1100-1400$ selon le quartier
  * Basement 2BR neuf: 1300-1600$ selon le quartier  
  * Upper level 3BR neuf: 2000-2400$ selon le quartier (c'est le plus grand et le plus demandé)
  * Main floor 2BR neuf: 1400-1700$ selon le quartier
- Ces fourchettes sont basées sur RentFaster.ca et Rentals.ca pour Edmonton en 2025-2026
- Un upper 3BR neuf ne devrait JAMAIS être en dessous de 2000$/mois à Edmonton

Réponds UNIQUEMENT avec du JSON valide:
{
  "neighborhoodName": "string",
  "demographics": {
    "ownerPercent": number,
    "renterPercent": number,
    "marketType": "Quartier de locataires" | "Quartier de propriétaires" | "Quartier mixte",
    "socioEconomic": "string",
    "medianHouseholdIncome": number (revenu médian des ménages du quartier en $ CAD),
    "edmontonMedianIncome": number (revenu médian des ménages d'Edmonton en $ CAD, environ 80000-90000)
  },
  "vacancy": { "currentRate": number, "trend": "string", "cityAverage": 4.3 },
  "marketRents": {
    "basement_1br": number (loyer mensuel réaliste pour un sous-sol 1 chambre NEUF dans CE quartier),
    "basement_2br": number (loyer mensuel réaliste pour un sous-sol 2 chambres NEUF dans CE quartier),
    "upper_3br": number (loyer mensuel réaliste pour un étage supérieur 3 chambres NEUF dans CE quartier),
    "main_2br": number (loyer mensuel réaliste pour un rez-de-chaussée 2 chambres NEUF dans CE quartier)
  },
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
          await new Promise(r => setTimeout(r, (attempt + 1) * 16000));
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

// ── Post-extraction validation & fixes ──

function fixInterestRate(rate: number): number {
  // If AI returned decimal (0.04) instead of percentage (4), fix it
  if (rate > 0 && rate < 1) return rate * 100;
  return rate;
}

function fixExpenseAmount(value: number, annualRevenue: number): number {
  // If a value looks like a percentage (< 100) when it should be dollars, leave it
  // If it's clearly too small to be an annual expense, it might be monthly
  if (value > 0 && value < 50 && annualRevenue > 10000) {
    // Likely a percentage — convert to dollars
    return Math.round((value / 100) * annualRevenue);
  }
  return value;
}

// ── Public functions ──

export async function extractWithAI(content: string, apiKey: string): Promise<ProFormaData> {
  const parsed = await callGemini(EXTRACTION_PROMPT, `Voici le contenu du pro forma:\n\n${content}`, apiKey);

  const declaredUnits = parsed.numberOfUnits || 0;
  let units = (parsed.units || []).map((u: any) => ({
    type: u.type || 'Unknown',
    bedrooms: u.bedrooms || 2,
    configuration: u.configuration || 'unknown',
    monthlyRent: u.monthlyRent || 0,
    parkingFee: u.parkingFee || 0,
    petFee: u.petFee || 0,
  }));

  // If AI found fewer units than declared, retry with a more specific prompt
  if (declaredUnits > 0 && units.length < declaredUnits) {
    console.warn(`AI extracted ${units.length} units but pro forma declares ${declaredUnits}. Retrying...`);
    const retryParsed = await callGemini(
      EXTRACTION_PROMPT + `\n\nATTENTION: Ce pro forma contient ${declaredUnits} unités. Tu DOIS retourner exactement ${declaredUnits} entrées dans le tableau "units". Cherche TOUTES les lignes avec des loyers.`,
      `Voici le contenu du pro forma:\n\n${content}`,
      apiKey
    );
    const retryUnits = (retryParsed.units || []).map((u: any) => ({
      type: u.type || 'Unknown',
      bedrooms: u.bedrooms || 2,
      configuration: u.configuration || 'unknown',
      monthlyRent: u.monthlyRent || 0,
      parkingFee: u.parkingFee || 0,
      petFee: u.petFee || 0,
    }));
    if (retryUnits.length > units.length) {
      units = retryUnits;
    }
  }

  const salePrice = parsed.salePrice || 0;
  const cmhcInsurance = parsed.loan?.cmhcInsurance || 0;
  const downPayment = parsed.downPayment || salePrice * 0.2;
  // Always: sale price - down payment + CMHC premium
  const loanAmount = (salePrice - downPayment) + cmhcInsurance;
  const rate = fixInterestRate(parsed.loan?.interestRate || 5);
  const amort = parsed.loan?.amortizationYears || 25;
  const mr = (rate / 100) / 12;
  const n = amort * 12;
  const monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
  const totalMonthlyRevenue = units.reduce((s: number, u: any) => s + u.monthlyRent + u.parkingFee + u.petFee, 0);
  const totalAnnualRevenue = totalMonthlyRevenue * 12;

  const exp = parsed.expenses || {};

  // Fix vacancy: use dollar amount if provided, otherwise calculate from percent
  let vacancyDollar = exp.vacancyDollar || 0;
  let vacancyPercent = exp.vacancyPercent || 0;
  if (vacancyDollar > 0 && vacancyPercent === 0 && totalAnnualRevenue > 0) {
    vacancyPercent = Math.round((vacancyDollar / totalAnnualRevenue) * 10000) / 100;
  } else if (vacancyPercent > 0 && vacancyDollar === 0) {
    vacancyDollar = Math.round((vacancyPercent / 100) * totalAnnualRevenue);
  }

  const propertyTax = exp.propertyTax || 0;
  const insurance = exp.insurance || 0;
  const maintenance = exp.maintenance || 0;
  const management = exp.management || 0;
  const caretaker = exp.caretaker || 0;
  const capitalReserve = exp.capitalReserve || 0;
  const utilities = exp.utilities || 0;
  const other = exp.other || 0;

  const totalExpenses = propertyTax + insurance + maintenance + management +
    caretaker + capitalReserve + utilities + other + vacancyDollar;

  return {
    salePrice,
    numberOfUnits: parsed.numberOfUnits || units.length,
    address: parsed.address || 'Adresse non trouvée',
    aiNeighborhood: parsed.neighborhood || undefined,
    units,
    totalMonthlyRevenue,
    totalAnnualRevenue,
    downPayment,
    closingCosts: parsed.closingCosts || salePrice * 0.015,
    loan: { amount: loanAmount, interestRate: rate, amortizationYears: amort, monthlyPayment: Math.round(monthlyPayment * 100) / 100, cmhcInsurance },
    expenses: {
      propertyTax, insurance, maintenance, management,
      vacancy: vacancyPercent,
      vacancyDollar,
      caretaker, capitalReserve, utilities, other,
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
