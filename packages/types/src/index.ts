// Shared domain types for Fix or Replace Auto.
// Used by: the RN app, Supabase Edge Functions, and packages/calc-engine.

export type ReliabilityBucket = 'reliable' | 'some_problems' | 'problem_vehicle';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor';
export type Recommendation = 'fix' | 'get_quote' | 'replace' | 'too_close';

export interface Vehicle {
  id: string;
  userId: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  body: string | null;
  nickname: string | null;
  primaryDriver: 'me' | 'spouse_partner' | 'child' | 'other' | null;
  zip: string;
  currentMileage: number;
  currentLoanPayoff: number;
  condition: VehicleCondition;
  reliabilityBucket: ReliabilityBucket;
  createdAt: string;
}

export interface RepairEvent {
  id: string;
  vehicleId: string;
  description: string;
  category: string;
  cost: number;
  isSafetyIssue: boolean | null;
  source: 'estimate' | 'user_reported';
  createdAt: string;
}

/** Everything the calc engine needs to score keeping the current vehicle. */
export interface KeepInput {
  currentRepairCost: number;
  recentRepairsSum: number;
  ageYears: number;
  mileage: number;
  condition: VehicleCondition;
  reliabilityBucket: ReliabilityBucket;
  currentVehicleValue: number;
  currentLoanPayoff: number;
}

/** Everything the calc engine needs to score acquiring a replacement. */
export interface ReplaceInput {
  replacementPrice: number;
  salesTax: number;
  title: number;
  registration: number;
  docFee: number;
  delivery: number;
  otherFees: number;
  tradeOrSaleValue: number;
  loanPayoff: number;
  downPayment: number;
  interestRate: number;
  loanTermMonths: number;
  financeMethod: 'cash' | 'finance';
}

export interface CalcInput {
  keep: KeepInput;
  replace: ReplaceInput;
}

export interface CalcOutput {
  netReplacementAcquisitionCost: number;
  totalAcquisitionCostIncludingFinancing: number;
  monthlyPayment: number;
  totalInterest: number;
  effectiveKeepCost: number;
  repairThreshold: number;
  recommendation: Recommendation;
  currentEquity: number;
}

export interface Decision {
  id: string;
  vehicleId: string;
  repairEventId: string | null;
  recommendation: Recommendation;
  calcInput: CalcInput;
  calcOutput: CalcOutput;
  aiExplanation: string | null;
  createdAt: string;
}

export interface ValuationCache {
  vehicleId: string;
  valueLow: number;
  valueHigh: number;
  workingValue: number;
  tradeValue: number;
  source: string;
  fetchedAt: string;
}

/** Adapter interface so the valuation vendor is swappable (see build plan step 10). */
export interface VehicleValuationProvider {
  getValuation(input: {
    vin: string | null;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    mileage: number;
    zip: string;
    condition: VehicleCondition;
  }): Promise<Omit<ValuationCache, 'vehicleId' | 'fetchedAt'>>;
}
