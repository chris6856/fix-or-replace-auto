import type { CalcInput, CalcOutput, Recommendation } from '@fixorreplace/types';
import { amortize } from './amortization';
import { computeRepairThreshold } from './repairThreshold';
import { FIX_BAND_MAX_RATIO, REPLACE_BAND_MIN_RATIO, TOO_CLOSE_TO_CALL_FRACTION } from './constants';

export { amortize } from './amortization';
export type { AmortizationResult } from './amortization';
export { computeRepairThreshold } from './repairThreshold';
export * from './constants';

export function computeDecision(input: CalcInput): CalcOutput {
  const { keep, replace } = input;

  const outTheDoorPrice =
    replace.replacementPrice +
    replace.salesTax +
    replace.title +
    replace.registration +
    replace.docFee +
    replace.delivery +
    replace.otherFees;

  // "Net value available" from the current vehicle (Screen 18) — can go
  // negative when the loan payoff exceeds the trade/sale value.
  const netCurrentVehicleValue = replace.tradeOrSaleValue - replace.loanPayoff;
  const netReplacementAcquisitionCost = outTheDoorPrice - netCurrentVehicleValue;

  const amountFinanced = Math.max(0, netReplacementAcquisitionCost - replace.downPayment);
  const { monthlyPayment, totalInterest } =
    replace.financeMethod === 'finance'
      ? amortize(amountFinanced, replace.interestRate, replace.loanTermMonths)
      : { monthlyPayment: 0, totalInterest: 0 };

  // The true total cost of replacing, including financing — this is what
  // repair spending is ultimately weighed against, never the sticker price.
  const totalAcquisitionCostIncludingFinancing = netReplacementAcquisitionCost + totalInterest;

  const repairThreshold = computeRepairThreshold(keep, totalAcquisitionCostIncludingFinancing);
  const effectiveKeepCost = keep.currentRepairCost + keep.recentRepairsSum;
  const currentEquity = keep.currentVehicleValue - keep.currentLoanPayoff;

  const recommendation = bandRecommendation(
    keep.currentRepairCost,
    repairThreshold,
    totalAcquisitionCostIncludingFinancing,
  );

  return {
    netReplacementAcquisitionCost,
    totalAcquisitionCostIncludingFinancing,
    monthlyPayment,
    totalInterest,
    effectiveKeepCost,
    repairThreshold,
    recommendation,
    currentEquity,
  };
}

function bandRecommendation(
  currentRepairCost: number,
  repairThreshold: number,
  totalReplacementReferenceCost: number,
): Recommendation {
  // Checked first and overrides the ratio bands below: if the repair cost
  // and the full cost of replacing land close to each other in absolute
  // dollars, neither option carries a real financial edge, regardless of
  // how the vehicle's value/condition/history shape the threshold.
  const absoluteGap = Math.abs(currentRepairCost - totalReplacementReferenceCost);
  if (absoluteGap <= totalReplacementReferenceCost * TOO_CLOSE_TO_CALL_FRACTION) {
    return 'too_close';
  }

  const ratio = repairThreshold > 0 ? currentRepairCost / repairThreshold : Infinity;
  if (ratio <= FIX_BAND_MAX_RATIO) return 'fix';
  if (ratio >= REPLACE_BAND_MIN_RATIO) return 'replace';
  return 'get_quote';
}
