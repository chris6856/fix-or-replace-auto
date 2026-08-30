import type { CalcInput, CalcOutput } from '@fixorreplace/types';
import type { DecisionDraft } from './DecisionDraftContext';

export interface AnalysisResult {
  input: CalcInput;
  output: CalcOutput;
}

/**
 * Maps the screen-by-screen intake draft (Screens 9-19) into the calc
 * engine's CalcInput shape. Split out as its own function so Screen 20
 * ("Running the Numbers") is just "map, then computeDecision()".
 */
export function buildCalcInput(draft: DecisionDraft): CalcInput {
  const ageYears = Math.max(0, new Date().getFullYear() - draft.vehicleYear);

  return {
    keep: {
      currentRepairCost: draft.totalRepairEstimate,
      recentRepairsSum: draft.recentRepairsSum,
      ageYears,
      mileage: draft.currentMileage,
      condition: draft.conditionBeforeThisProblem ?? 'good',
      reliabilityBucket: draft.reliabilityBucket ?? 'reliable',
      currentVehicleValue: draft.currentVehicleValueWorking ?? 0,
      currentLoanPayoff: draft.loanPayoff,
    },
    replace: {
      replacementPrice: draft.replacementPrice,
      salesTax: draft.salesTax,
      // Screen 17's UI combines title + registration into one line -- see
      // the comment on DecisionDraft.titleRegistration. Only the sum feeds
      // the calc engine, so it doesn't matter which field holds it.
      title: draft.titleRegistration,
      registration: 0,
      docFee: draft.docFee,
      delivery: draft.delivery,
      otherFees: draft.otherFees,
      tradeOrSaleValue: draft.currentVehicleTradeValue,
      loanPayoff: draft.loanPayoff,
      downPayment: draft.downPayment,
      interestRate: draft.interestRate,
      loanTermMonths: draft.loanTermMonths,
      financeMethod: draft.financeMethod ?? 'cash',
    },
  };
}
