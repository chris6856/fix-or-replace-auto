import type { KeepInput } from '@fixorreplace/types';
import { computeRepairThreshold } from './repairThreshold';

const baseKeep: KeepInput = {
  currentRepairCost: 0,
  recentRepairsSum: 0,
  ageYears: 5,
  mileage: 60_000,
  condition: 'good',
  reliabilityBucket: 'reliable',
  currentVehicleValue: 10_000,
  currentLoanPayoff: 0,
};

const bigReplacementReferenceCost = 100_000; // large enough that the value-based cap always binds below it

test('a reliable vehicle gets a larger repair budget than an unreliable one of equal value', () => {
  const reliable = computeRepairThreshold(baseKeep, bigReplacementReferenceCost);
  const problem = computeRepairThreshold(
    { ...baseKeep, reliabilityBucket: 'problem_vehicle' },
    bigReplacementReferenceCost,
  );
  expect(reliable).toBeGreaterThan(problem);
});

test('high age or mileage discounts the budget even for a reliable, good-condition vehicle', () => {
  const normal = computeRepairThreshold(baseKeep, bigReplacementReferenceCost);
  const highMileage = computeRepairThreshold({ ...baseKeep, mileage: 160_000 }, bigReplacementReferenceCost);
  expect(highMileage).toBeLessThan(normal);
});

test('recent repair spending reduces the remaining budget', () => {
  const noHistory = computeRepairThreshold(baseKeep, bigReplacementReferenceCost);
  const recentRepairs = computeRepairThreshold({ ...baseKeep, recentRepairsSum: 2_000 }, bigReplacementReferenceCost);
  expect(recentRepairs).toBeLessThan(noHistory);
});

test('threshold is capped by replacement economics even for a high-value vehicle', () => {
  const highValueKeep: KeepInput = { ...baseKeep, currentVehicleValue: 50_000 };
  const smallReplacementReferenceCost = 5_000;
  const threshold = computeRepairThreshold(highValueKeep, smallReplacementReferenceCost);
  // reliable cap fraction is 0.55 (see constants.ts)
  expect(threshold).toBeCloseTo(smallReplacementReferenceCost * 0.55, 6);
});

test('threshold never goes negative', () => {
  const threshold = computeRepairThreshold(
    { ...baseKeep, currentVehicleValue: 500, recentRepairsSum: 5_000, reliabilityBucket: 'problem_vehicle' },
    bigReplacementReferenceCost,
  );
  expect(threshold).toBeGreaterThanOrEqual(0);
});
