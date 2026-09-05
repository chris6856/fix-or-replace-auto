// Ported from packages/calc-engine (the same logic the app uses) so the
// website's free preview gives an identical recommendation without needing
// any build tooling here. Keep this in sync by hand if that package's
// scoring math ever changes -- this file has no other dependencies.
(function (global) {
  'use strict';

  const VALUE_MULTIPLIER_BY_RELIABILITY = { reliable: 1.5, some_problems: 0.9, problem_vehicle: 0.6 };
  const CONDITION_ADJUSTMENT = { excellent: 1.1, good: 1.0, fair: 0.85, poor: 0.65 };
  const HIGH_AGE_YEARS = 12;
  const HIGH_MILEAGE = 150000;
  const AGE_OR_MILEAGE_DISCOUNT = 0.9;
  const RECENT_REPAIR_DRAG = 0.5;
  const REPLACEMENT_CAP_FRACTION_BY_RELIABILITY = { reliable: 0.55, some_problems: 0.4, problem_vehicle: 0.25 };
  const FIX_BAND_MAX_RATIO = 0.85;
  const REPLACE_BAND_MIN_RATIO = 1.5;
  const TOO_CLOSE_TO_CALL_FRACTION = 0.08;

  function amortize(principal, annualRatePct, termMonths) {
    if (principal <= 0 || termMonths <= 0) return { monthlyPayment: 0, totalInterest: 0, totalPaid: 0 };
    const monthlyRate = annualRatePct / 100 / 12;
    const monthlyPayment =
      monthlyRate === 0
        ? principal / termMonths
        : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
    const totalPaid = monthlyPayment * termMonths;
    return { monthlyPayment, totalInterest: totalPaid - principal, totalPaid };
  }

  function computeRepairThreshold(keep, totalReplacementReferenceCost) {
    const ageOrMileageFactor =
      keep.ageYears > HIGH_AGE_YEARS || keep.mileage > HIGH_MILEAGE ? AGE_OR_MILEAGE_DISCOUNT : 1;
    const valueBasedCap =
      keep.currentVehicleValue *
        VALUE_MULTIPLIER_BY_RELIABILITY[keep.reliabilityBucket] *
        CONDITION_ADJUSTMENT[keep.condition] *
        ageOrMileageFactor -
      keep.recentRepairsSum * RECENT_REPAIR_DRAG;
    const replacementBasedCap =
      totalReplacementReferenceCost * REPLACEMENT_CAP_FRACTION_BY_RELIABILITY[keep.reliabilityBucket];
    return Math.max(0, Math.min(valueBasedCap, replacementBasedCap));
  }

  function bandRecommendation(currentRepairCost, repairThreshold, totalReplacementReferenceCost) {
    const absoluteGap = Math.abs(currentRepairCost - totalReplacementReferenceCost);
    if (absoluteGap <= totalReplacementReferenceCost * TOO_CLOSE_TO_CALL_FRACTION) return 'too_close';
    const ratio = repairThreshold > 0 ? currentRepairCost / repairThreshold : Infinity;
    if (ratio <= FIX_BAND_MAX_RATIO) return 'fix';
    if (ratio >= REPLACE_BAND_MIN_RATIO) return 'replace';
    return 'get_quote';
  }

  function computeDecision(input) {
    const keep = input.keep;
    const replace = input.replace;

    const outTheDoorPrice =
      replace.replacementPrice +
      replace.salesTax +
      replace.title +
      replace.registration +
      replace.docFee +
      replace.delivery +
      replace.otherFees;

    const netCurrentVehicleValue = replace.tradeOrSaleValue - replace.loanPayoff;
    const netReplacementAcquisitionCost = outTheDoorPrice - netCurrentVehicleValue;

    const amountFinanced = Math.max(0, netReplacementAcquisitionCost - replace.downPayment);
    const financed =
      replace.financeMethod === 'finance'
        ? amortize(amountFinanced, replace.interestRate, replace.loanTermMonths)
        : { monthlyPayment: 0, totalInterest: 0 };

    const totalAcquisitionCostIncludingFinancing = netReplacementAcquisitionCost + financed.totalInterest;
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
      monthlyPayment: financed.monthlyPayment,
      totalInterest: financed.totalInterest,
      effectiveKeepCost,
      repairThreshold,
      recommendation,
      currentEquity,
    };
  }

  function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString();
  }

  const RECOMMENDATION_DISPLAY = {
    fix: { emoji: '\u{1F7E2}', label: 'FIX IT', color: '#2F7A4F' },
    get_quote: { emoji: '\u{1F7E1}', label: 'GET ANOTHER QUOTE', color: '#B8860B' },
    replace: { emoji: '\u{1F534}', label: 'REPLACE IT', color: '#C62828' },
    too_close: { emoji: '⚪', label: 'TOO CLOSE TO CALL', color: '#555' },
  };

  function explainResult(input, output) {
    const repairCost = formatCurrency(input.keep.currentRepairCost);
    const netCost = formatCurrency(output.netReplacementAcquisitionCost);
    switch (output.recommendation) {
      case 'fix':
        return (
          'Although the ' +
          repairCost +
          ' repair is a real expense, replacing this vehicle would cost roughly ' +
          netCost +
          ' once taxes, fees, and financing are included. Keeping it is the stronger financial move right now.'
        );
      case 'get_quote':
        return (
          'Your ' +
          repairCost +
          " estimate is close to what we'd consider a reasonable ceiling for a vehicle in this condition. It may " +
          'still be worth repairing, but a second quote could help confirm the price before committing.'
        );
      case 'replace':
        return (
          'A ' +
          repairCost +
          " repair is more than this vehicle's condition and history can reasonably justify, especially against " +
          'a net replacement cost of ' +
          netCost +
          '. Replacing it is the stronger financial move here.'
        );
      case 'too_close':
        return (
          'The ' +
          repairCost +
          ' repair and the ' +
          netCost +
          ' cost of replacing land close enough together that neither option has a clear financial edge. This ' +
          'one comes down to your own preference.'
        );
      default:
        return '';
    }
  }

  global.FixOrReplaceCalc = {
    computeDecision: computeDecision,
    formatCurrency: formatCurrency,
    explainResult: explainResult,
    RECOMMENDATION_DISPLAY: RECOMMENDATION_DISPLAY,
  };
})(window);
