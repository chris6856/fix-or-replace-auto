import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import type { ReliabilityBucket, VehicleCondition } from '@fixorreplace/types';

/**
 * The in-progress "decision session" (build plan section 5) -- accumulates
 * answers screen-by-screen through the repair intake flow (blueprint
 * Screens 9-14) and replacement flow (Screens 15-19). Lives only in memory
 * and is never persisted until the final Save (a later milestone) -- see
 * claude.md.txt's full journey diagram.
 */
export interface DecisionDraft {
  vehicleId: string;
  vehicleYear: number;
  currentMileage: number;

  // Screen 10-11
  totalRepairEstimate: number;
  repairDescriptionRaw: string;
  repairCategory: string | null;
  isSafetyIssue: boolean | null;
  repairShopName: string | null;

  // Screen 12
  reliabilityBucket: ReliabilityBucket | null;
  recentRepairsSum: number;

  // Screen 13
  hasLoan: 'yes' | 'no' | 'not_sure' | null;
  loanPayoff: number;
  conditionBeforeThisProblem: VehicleCondition | null;

  // Screen 14 (manual entry for now -- see build plan milestone 10)
  currentVehicleValueWorking: number | null;
  currentVehicleValueLow: number | null;
  currentVehicleValueHigh: number | null;

  // Screen 15
  replacementCondition: 'used' | 'new' | null;

  // Screen 16
  replacementPrice: number;
  tradeDecision: 'trade' | 'sell' | 'keep' | 'not_sure' | null;
  currentVehicleTradeValue: number;

  // Screen 17 -- title/registration is one combined line in the blueprint's
  // UI (Screen 17), even though the calc engine's ReplaceInput keeps them
  // as separate fields; the mapper (milestone 7) puts this whole amount
  // into `title` and zeros `registration` since only the sum matters.
  salesTax: number;
  titleRegistration: number;
  docFee: number;
  delivery: number;
  otherFees: number;

  // Screen 19
  financeMethod: 'cash' | 'finance' | null;
  downPayment: number;
  interestRate: number;
  loanTermMonths: number;
}

function createEmptyDraft(vehicleId: string, vehicleYear: number, currentMileage: number): DecisionDraft {
  return {
    vehicleId,
    vehicleYear,
    currentMileage,
    totalRepairEstimate: 0,
    repairDescriptionRaw: '',
    repairCategory: null,
    isSafetyIssue: null,
    repairShopName: null,
    reliabilityBucket: null,
    recentRepairsSum: 0,
    hasLoan: null,
    loanPayoff: 0,
    conditionBeforeThisProblem: null,
    currentVehicleValueWorking: null,
    currentVehicleValueLow: null,
    currentVehicleValueHigh: null,
    replacementCondition: null,
    replacementPrice: 0,
    tradeDecision: null,
    currentVehicleTradeValue: 0,
    salesTax: 0,
    titleRegistration: 0,
    docFee: 0,
    delivery: 0,
    otherFees: 0,
    financeMethod: null,
    downPayment: 0,
    interestRate: 0,
    loanTermMonths: 60,
  };
}

interface DecisionDraftContextValue {
  draft: DecisionDraft | null;
  startDraft: (vehicleId: string, vehicleYear: number, currentMileage: number) => void;
  updateDraft: (patch: Partial<DecisionDraft>) => void;
  clearDraft: () => void;
}

const DecisionDraftContext = createContext<DecisionDraftContextValue | undefined>(undefined);

export function DecisionDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<DecisionDraft | null>(null);

  const value = useMemo<DecisionDraftContextValue>(
    () => ({
      draft,
      startDraft: (vehicleId, vehicleYear, currentMileage) =>
        setDraft(createEmptyDraft(vehicleId, vehicleYear, currentMileage)),
      updateDraft: (patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev)),
      clearDraft: () => setDraft(null),
    }),
    [draft],
  );

  return <DecisionDraftContext.Provider value={value}>{children}</DecisionDraftContext.Provider>;
}

export function useDecisionDraft(): DecisionDraftContextValue {
  const ctx = useContext(DecisionDraftContext);
  if (!ctx) throw new Error('useDecisionDraft must be used within a DecisionDraftProvider');
  return ctx;
}
