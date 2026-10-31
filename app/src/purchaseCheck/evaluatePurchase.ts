import type { PurchaseVerdict } from '@fixorreplace/types';

export interface PurchaseEvaluation {
  verdict: PurchaseVerdict;
  differenceFromMarket: number;
  differencePercent: number;
}

/**
 * Pure comparison, no AI involved -- unlike Price Check, this is grounded
 * in a real MarketCheck market-value prediction for the exact VIN, so the
 * verdict is computed from the same +/-15% band valuation-proxy already
 * produces (and CurrentValueScreen already shows for owned vehicles), not
 * judged by a model.
 */
export function evaluatePurchase(
  askingPrice: number,
  marketValue: number,
  valueLow: number,
  valueHigh: number,
): PurchaseEvaluation {
  const verdict: PurchaseVerdict =
    askingPrice < valueLow ? 'below_market' : askingPrice > valueHigh ? 'above_market' : 'at_market';
  const differenceFromMarket = askingPrice - marketValue;
  const differencePercent = marketValue !== 0 ? (differenceFromMarket / marketValue) * 100 : 0;

  return { verdict, differenceFromMarket, differencePercent };
}
