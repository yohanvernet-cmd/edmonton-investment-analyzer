/**
 * Edmonton market data constants.
 * In production, these would be fetched from CMHC API, Rentals.ca, etc.
 * Updated periodically to reflect current market conditions.
 */

export const EDMONTON_MARKET = {
  averagePricePerUnit: 185000,  // Average price per unit for multi-family in Edmonton

  // CMHC average rents by unit type (new construction)
  marketRents: {
    'basement_1': { rent: 950, label: 'Sous-sol 1 chambre (neuf)' },
    'basement_2': { rent: 1150, label: 'Sous-sol 2 chambres (neuf)' },
    'upper_3': { rent: 1650, label: 'Étage supérieur 3 chambres (neuf)' },
    'main_2': { rent: 1350, label: 'Rez-de-chaussée 2 chambres (neuf)' },
    'main_3': { rent: 1550, label: 'Rez-de-chaussée 3 chambres (neuf)' },
    'upper_2': { rent: 1400, label: 'Étage supérieur 2 chambres (neuf)' },
    'basement_3': { rent: 1250, label: 'Sous-sol 3 chambres (neuf)' },
    'unknown_1': { rent: 1000, label: '1 chambre' },
    'unknown_2': { rent: 1300, label: '2 chambres' },
    'unknown_3': { rent: 1550, label: '3 chambres' },
  } as Record<string, { rent: number; label: string }>,

  // Minimum thresholds for expense validation
  minimums: {
    interestRate: 4.25,
    propertyTaxRate: 0.009,  // 0.9% of purchase price
    vacancyRate: 5,          // 5% minimum
    maintenanceRate: 0.05,   // 5% of gross revenue
    capitalReserveRate: 0.05, // 5% of gross revenue
  },

  // City-wide averages
  cityAverages: {
    vacancyRate: 4.3,
    crimeRateIndex: 100,  // baseline index
    walkScore: 45,
  },
};

/** Edmonton neighborhood data (simplified — in production, fetched from APIs) */
export const EDMONTON_NEIGHBORHOODS: Record<string, {
  ownerPercent: number; renterPercent: number;
  vacancyRate: number; vacancyTrend: { year: number; rate: number }[];
  crimeIndex: number; predominantCrimes: string[]; crimeTrend: string;
  walkScore: number; transitScore: number;
  socioEconomic: string;
}> = {
  default: {
    ownerPercent: 55, renterPercent: 45,
    vacancyRate: 4.3,
    vacancyTrend: [
      { year: 2022, rate: 5.1 }, { year: 2023, rate: 4.8 },
      { year: 2024, rate: 4.5 }, { year: 2025, rate: 4.3 },
    ],
    crimeIndex: 100, predominantCrimes: ['Vol', 'Méfait', 'Introduction par effraction'],
    crimeTrend: 'Stable',
    walkScore: 45, transitScore: 40,
    socioEconomic: 'Revenu moyen',
  },
  // Add specific neighborhoods as needed
  'downtown': {
    ownerPercent: 25, renterPercent: 75,
    vacancyRate: 6.2,
    vacancyTrend: [
      { year: 2022, rate: 8.5 }, { year: 2023, rate: 7.2 },
      { year: 2024, rate: 6.8 }, { year: 2025, rate: 6.2 },
    ],
    crimeIndex: 165, predominantCrimes: ['Vol', 'Agression', 'Méfait', 'Drogue'],
    crimeTrend: 'En amélioration',
    walkScore: 82, transitScore: 75,
    socioEconomic: 'Mixte',
  },
  'millwoods': {
    ownerPercent: 72, renterPercent: 28,
    vacancyRate: 3.1,
    vacancyTrend: [
      { year: 2022, rate: 3.8 }, { year: 2023, rate: 3.5 },
      { year: 2024, rate: 3.3 }, { year: 2025, rate: 3.1 },
    ],
    crimeIndex: 78, predominantCrimes: ['Vol de véhicule', 'Vol', 'Méfait'],
    crimeTrend: 'En amélioration',
    walkScore: 52, transitScore: 48,
    socioEconomic: 'Revenu moyen-élevé',
  },
  'west edmonton': {
    ownerPercent: 65, renterPercent: 35,
    vacancyRate: 3.5,
    vacancyTrend: [
      { year: 2022, rate: 4.2 }, { year: 2023, rate: 3.9 },
      { year: 2024, rate: 3.7 }, { year: 2025, rate: 3.5 },
    ],
    crimeIndex: 85, predominantCrimes: ['Vol', 'Méfait'],
    crimeTrend: 'Stable',
    walkScore: 55, transitScore: 50,
    socioEconomic: 'Revenu moyen-élevé',
  },
};

export function getNeighborhoodData(address: string) {
  const lower = address.toLowerCase();
  for (const [key, data] of Object.entries(EDMONTON_NEIGHBORHOODS)) {
    if (key !== 'default' && lower.includes(key)) return { name: key, ...data };
  }
  return { name: 'Edmonton (moyenne)', ...EDMONTON_NEIGHBORHOODS.default };
}

export function getMarketRent(configuration: string, bedrooms: number): number {
  const key = `${configuration}_${bedrooms}`;
  return EDMONTON_MARKET.marketRents[key]?.rent
    || EDMONTON_MARKET.marketRents[`unknown_${bedrooms}`]?.rent
    || 1200;
}

export function getMarketRentLabel(configuration: string, bedrooms: number): string {
  const key = `${configuration}_${bedrooms}`;
  return EDMONTON_MARKET.marketRents[key]?.label
    || EDMONTON_MARKET.marketRents[`unknown_${bedrooms}`]?.label
    || `${bedrooms} chambre(s)`;
}
