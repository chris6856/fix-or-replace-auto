import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import type { ReliabilityBucket, VehicleCondition } from '@fixorreplace/types';

/**
 * The in-progress "decision session" (build plan section 5) -- accumulates
 * answers screen-by-screen through the repair intake flow (blueprint
 * Screens 9-14) and, eventually, the replacement flow. Lives only in memory
 * and is never persisted until the final Save (a later milestone) -- see
 * claude.md.txt's full journey diagram.
 */
export interface DecisionDraft {
  vehicleId: string;
  currentMileage: number;

  // Screen 10-11
  totalRepairEstimate: number;
  repairDescriptionRaw: string;
  repairCategory: string | null;
  isSafetyIssue: boolean | null;

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
}

function createEmptyDraft(vehicleId: string, currentMileage: number): DecisionDraft {
  return {
    vehicleId,
    currentMileage,
    totalRepairEstimate: 0,
    repairDescriptionRaw: '',
    repairCategory: null,
    isSafetyIssue: null,
    reliabilityBucket: null,
    recentRepairsSum: 0,
    hasLoan: null,
    loanPayoff: 0,
    conditionBeforeThisProblem: null,
    currentVehicleValueWorking: null,
    currentVehicleValueLow: null,
    currentVehicleValueHigh: null,
  };
}

interface DecisionDraftContextValue {
  draft: DecisionDraft | null;
  startDraft: (vehicleId: string, currentMileage: number) => void;
  updateDraft: (patch: Partial<DecisionDraft>) => void;
  clearDraft: () => void;
}

const DecisionDraftContext = createContext<DecisionDraftContextValue | undefined>(undefined);

export function DecisionDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<DecisionDraft | null>(null);

  const value = useMemo<DecisionDraftContextValue>(
    () => ({
      draft,
      startDraft: (vehicleId, currentMileage) => setDraft(createEmptyDraft(vehicleId, currentMileage)),
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
