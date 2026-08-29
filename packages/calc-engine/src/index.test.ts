import type { CalcInput } from '@fixorreplace/types';
import { computeDecision } from './index';

/**
 * The blueprint's own worked example (claude.md.txt): a 2013 Ford Escape
 * Titanium, 155,000 miles, reliable history, $4,000 suspension repair,
 * versus replacing with a $22,000 vehicle financed with $3,000 down at
 * 7.25% for 60 months. The blueprint is explicit that a naive
 * repair-cost-vs-value ratio must NOT drive this to "replace" just because
 * $4,000 is a large fraction of the Escape's ~$4,750 market value.
 */
function escapeScenario(currentRepairCost: number): CalcInput {
  return {
    keep: {
      currentRepairCost,
      recentRepairsSum: 0,
      ageYears: 13,
      mileage: 155_000,
      condition: 'good',
      reliabilityBucket: 'reliable',
      currentVehicleValue: 4_750,
      currentLoanPayoff: 0,
    },
    replace: {
      replacementPrice: 22_000,
      salesTax: 1_320,
      title: 150,
      registration: 150,
      docFee: 200,
      delivery: 0,
      otherFees: 0,
      tradeOrSaleValue: 2_500,
      loanPayoff: 0,
      downPayment: 3_000,
      interestRate: 7.25,
      loanTermMonths: 60,
      financeMethod: 'finance',
    },
  };
}

test('acceptance case: a $4,000 repair on the Escape recommends FIX, not replace', () => {
  const output = computeDecision(escapeScenario(4_000));
  expect(output.recommendation).toBe('fix');
  expect(output.netReplacementAcquisitionCost).toBeCloseTo(21_320, 6);
});

test('what-if progression: raising the repair estimate moves the recommendation through the bands', () => {
  // Mirrors Screen 25 of the blueprint: $4,000 -> fix, $7,500 -> get another
  // quote, $10,000 -> replace, using the exact same replacement scenario.
  expect(computeDecision(escapeScenario(4_000)).recommendation).toBe('fix');
  expect(computeDecision(escapeScenario(7_500)).recommendation).toBe('get_quote');
  expect(computeDecision(escapeScenario(10_000)).recommendation).toBe('replace');
});

test('cash purchase skips financing cost entirely', () => {
  const scenario = escapeScenario(4_000);
  scenario.replace.financeMethod = 'cash';
  const output = computeDecision(scenario);
  expect(output.monthlyPayment).toBe(0);
  expect(output.totalInterest).toBe(0);
  expect(output.totalAcquisitionCostIncludingFinancing).toBeCloseTo(output.netReplacementAcquisitionCost, 6);
});

test('an upside-down loan on the trade-in makes replacing more expensive, not less', () => {
  const scenario = escapeScenario(4_000);
  scenario.replace.loanPayoff = 6_000; // owes more than the $2,500 trade value
  const output = computeDecision(scenario);
  expect(output.netReplacementAcquisitionCost).toBeGreaterThan(escapeAt4000NetCost());
  expect(output.recommendation).toBe('fix');
});

function escapeAt4000NetCost(): number {
  return computeDecision(escapeScenario(4_000)).netReplacementAcquisitionCost;
}

test('current equity reflects value minus loan payoff, paid off or not', () => {
  const paidOff = computeDecision(escapeScenario(4_000));
  expect(paidOff.currentEquity).toBe(4_750);

  const scenario = escapeScenario(4_000);
  scenario.keep.currentLoanPayoff = 6_000;
  const stillOwed = computeDecision(scenario);
  expect(stillOwed.currentEquity).toBe(4_750 - 6_000);
});

test('too close to call: repair cost and true replacement cost land within the tolerance band', () => {
  const input: CalcInput = {
    keep: {
      currentRepairCost: 12_000,
      recentRepairsSum: 0,
      ageYears: 8,
      mileage: 90_000,
      condition: 'good',
      reliabilityBucket: 'reliable',
      currentVehicleValue: 8_000,
      currentLoanPayoff: 0,
    },
    replace: {
      replacementPrice: 10_500,
      salesTax: 630,
      title: 100,
      registration: 100,
      docFee: 150,
      delivery: 0,
      otherFees: 0,
      tradeOrSaleValue: 0,
      loanPayoff: 0,
      downPayment: 0,
      interestRate: 0,
      loanTermMonths: 0,
      financeMethod: 'cash',
    },
  };

  const output = computeDecision(input);
  expect(output.totalAcquisitionCostIncludingFinancing).toBeCloseTo(11_480, 6);
  expect(output.recommendation).toBe('too_close');
});

test('a well below threshold repair on a reliable vehicle with no replacement plan still recommends fix', () => {
  const scenario = escapeScenario(1_000);
  const output = computeDecision(scenario);
  expect(output.recommendation).toBe('fix');
});
