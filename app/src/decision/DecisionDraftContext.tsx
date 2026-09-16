import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReliabilityBucket, VehicleCondition } from '@fixorreplace/types';

// Only one repair-vs-replace decision can be in progress at a time, so a
// single fixed key is enough -- persisted so backing out of the app (or the
// OS killing it) doesn't discard several minutes of typed-in answers.
const STORAGE_KEY = '@fixorreplace/decisionDraft';

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
  /** True once the one-time load from disk has finished (or found nothing). */
  isRestored: boolean;
  startDraft: (vehicleId: string, vehicleYear: number, currentMileage: number) => void;
  updateDraft: (patch: Partial<DecisionDraft>) => void;
  clearDraft: () => void;
}

const DecisionDraftContext = createContext<DecisionDraftContextValue | undefined>(undefined);

export function DecisionDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<DecisionDraft | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  // Guards against writing back the initial `null` state over a draft
  // that's still being loaded from disk.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDraft(JSON.parse(raw));
      })
      .catch(() => {
        // Corrupt or unreadable draft -- just start fresh.
      })
      .finally(() => {
        hasLoadedRef.current = true;
        setIsRestored(true);
      });
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (draft) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft)).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [draft]);

  const value = useMemo<DecisionDraftContextValue>(
    () => ({
      draft,
      isRestored,
      startDraft: (vehicleId, vehicleYear, currentMileage) =>
        setDraft(createEmptyDraft(vehicleId, vehicleYear, currentMileage)),
      updateDraft: (patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev)),
      clearDraft: () => setDraft(null),
    }),
    [draft, isRestored],
  );

  return <DecisionDraftContext.Provider value={value}>{children}</DecisionDraftContext.Provider>;
}

export function useDecisionDraft(): DecisionDraftContextValue {
  const ctx = useContext(DecisionDraftContext);
  if (!ctx) throw new Error('useDecisionDraft must be used within a DecisionDraftProvider');
  return ctx;
}
