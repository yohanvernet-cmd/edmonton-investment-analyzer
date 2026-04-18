import type { ProFormaData } from '@/types';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const COMBINED_PROMPT = `Tu es un expert en analyse d'investissement immobilier a Edmonton, Alberta.
On te donne le contenu brut d'un pro forma immobilier. Tu dois faire 3 choses en UNE SEULE reponse JSON:

1. EXTRAIRE les donnees du pro forma
2. ANALYSER le quartier base sur l'adresse
3. GENERER un resume executif

REGLES CRITIQUES POUR L'EXTRACTION:
- Les montants sont en dollars canadiens, les loyers sont MENSUELS sauf indication contraire
- Le taux d'interet DOIT etre en pourcentage entier (4.5 pour 4.5%, PAS 0.045)
- Pour la vacance: retourne le montant ANNUEL en $ ET le pourcentage
- Pour TOUTES les depenses: retourne le montant ANNUEL en dollars
- UNITES: Extrais CHAQUE unite individuellement. Un immeuble de 8 unites = 8 entrees dans "units"
- Identifie chaque unite: sous-sol/basement, etage superieur/upper, rez-de-chaussee/main
- Separe les frais de stationnement et animaux des loyers de base

REGLES POUR LES LOYERS DU MARCHE:
- Base-toi sur RentFaster.ca, Rentals.ca, Zumper pour Edmonton
- Ce sont des CONSTRUCTIONS NEUVES = loyers plus eleves
- 1-2 chambres en SOUS-SOL, 3 chambres a l'ETAGE SUPERIEUR
- Le QUARTIER influence les loyers
- Fourchettes 2025-2026 pour du neuf: Basement 1BR: 1100-1400$, Basement 2BR: 1300-1600$, Upper 3BR: 2000-2400$, Main 2BR: 1400-1700$
- Un upper 3BR neuf ne devrait JAMAIS etre en dessous de 2000$/mois

REGLES POUR LE QUARTIER:
- Identifie le quartier PRECIS (sub-neighborhood). Ex: 2350 Millbourne Rd = Tweddle Place (pas Mill Woods)
- Score sur 10 pour investissement locatif

Reponds UNIQUEMENT avec du JSON valide:
{
  "proForma": {
    "salePrice": number,
    "numberOfUnits": number,
    "address": "string complete",
    "neighborhood": "string - quartier PRECIS (sub-neighborhood)",
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

// -- Bedrock API (Claude) --

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function callBedrock(prompt: string, userContent: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 8192,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: `${prompt}\n\nVoici le contenu du pro forma:\n\n${userContent}`
          }]
        })
      });

      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content?.[0]?.text || '{}';

      // Extract JSON from the response (Claude may wrap it in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (e: any) {
      if (e.name === 'ThrottlingException' || e.name === 'ServiceUnavailableException') {
        await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      throw new Error(`Bedrock error: ${e.message}`);
    }
  }
  throw new Error('IA indisponible. Reessayez dans quelques minutes.');
}

// -- Post-extraction fixes --

function fixInterestRate(rate: number): number {
  if (rate > 0 && rate < 1) return rate * 100;
  return rate;
}

// -- Single combined call --

export async function analyzeWithAI(content: string, _apiKey?: string): Promise<{
  proForma: ProFormaData;
  neighborhood: any;
  summary: any;
}> {
  const parsed = await callBedrock(COMBINED_PROMPT, content);

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
    address: pf.address || 'Adresse non trouvee',
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
