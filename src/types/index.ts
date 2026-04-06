// ── Pro Forma Data ──
export interface UnitDetail {
  type: string;           // e.g. "Basement 1BR", "Upper 3BR"
  bedrooms: number;
  configuration: string;  // e.g. "basement", "upper", "main"
  monthlyRent: number;
  parkingFee: number;
  petFee: number;
}

export interface LoanDetails {
  amount: number;
  interestRate: number;
  amortizationYears: number;
  monthlyPayment: number;
  cmhcInsurance: number;
}

export interface ProFormaData {
  salePrice: number;
  numberOfUnits: number;
  address: string;
  units: UnitDetail[];
  totalMonthlyRevenue: number;
  totalAnnualRevenue: number;
  expenses: ExpenseBreakdown;
  loan: LoanDetails;
  downPayment: number;
  closingCosts: number;
}

export interface ExpenseBreakdown {
  propertyTax: number;
  insurance: number;
  maintenance: number;
  management: number;
  vacancy: number;         // as percentage
  vacancyDollar: number;
  caretaker: number;
  capitalReserve: number;
  utilities: number;
  other: number;
  totalAnnual: number;
}

// ── Neighborhood Analysis ──
export interface NeighborhoodAnalysis {
  demographics: { ownerPercent: number; renterPercent: number; marketType: string; socioEconomic: string; medianIncome?: number; cityMedianIncome?: number };
  vacancy: { currentRate: number; historicalTrend: { year: number; rate: number }[]; cityAverage: number };
  marketRents: MarketRent[];
  safety: { crimeRate: number; cityAverage: number; predominantCrimes: string[]; trend: string };
  accessibility: { transitDistance: string; essentialServices: string; walkScore: number; highwayAccess: string };
  overallScore: number;
  scoreJustification: string;
}

export interface MarketRent {
  unitType: string;
  bedrooms: number;
  configuration: string;
  averageRent: number;
  source: string;
}

// ── Analysis Results ──
export interface RevenueAnalysis {
  units: {
    unitType: string;
    projectedRent: number;
    marketRent: number;
    gapDollar: number;
    gapPercent: number;
    alert: 'realistic' | 'optimistic' | 'high_risk';
  }[];
  totalProjectedMonthly: number;
  totalMarketMonthly: number;
}

export interface ExpenseAnalysis {
  items: {
    category: string;
    projected: number;
    recommended: number;
    gapDollar: number;
    impactOnNOI: number;
    flag: boolean;
  }[];
  projectedTotal: number;
  recommendedTotal: number;
}

export interface FinancialMetrics {
  noi: number;
  annualCashFlow: number;
  cashOnCashReturn: number;
  capRate: number;
  dscr: number;
  pricePerUnit: number;
  operatingExpenseRatio: number;
}

export interface MortgageComparison {
  originalRate: number;
  recommendedRate: number;
  originalMonthlyPayment: number;
  recommendedMonthlyPayment: number;
  monthlyDifference: number;
  annualDifference: number;
  flag: boolean;
}

export interface RevisedProForma {
  original: FinancialMetrics;
  revised: FinancialMetrics;
  adjustedRevenue: number;
  adjustedExpenses: number;
  mortgage: MortgageComparison;
}

export interface InvestmentScore {
  total: number;
  breakdown: { category: string; score: number; maxScore: number; details: string }[];
  recommendation: 'excellent' | 'good' | 'medium' | 'poor';
  recommendationLabel: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  opportunities: string[];
}

export interface FullAnalysis {
  proForma: ProFormaData;
  neighborhood: NeighborhoodAnalysis;
  revenueAnalysis: RevenueAnalysis;
  expenseAnalysis: ExpenseAnalysis;
  revisedProForma: RevisedProForma;
  investmentScore: InvestmentScore;
  timestamp: string;
  aiMarketRents?: Record<string, number>;
}

// ── App State ──
export type AnalysisStep = 'upload' | 'extracting' | 'analyzing' | 'neighborhood' | 'complete' | 'error';

export interface AppState {
  step: AnalysisStep;
  progress: number;
  progressMessage: string;
  file: File | null;
  analysis: FullAnalysis | null;
  error: string | null;
  setStep: (step: AnalysisStep) => void;
  setProgress: (progress: number, message: string) => void;
  setFile: (file: File | null) => void;
  setAnalysis: (analysis: FullAnalysis | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}
