import { amortize } from './amortization';

test('matches a known amortization table ($10,000 / 5% APR / 36 months)', () => {
  const { monthlyPayment, totalInterest, totalPaid } = amortize(10_000, 5, 36);
  expect(monthlyPayment).toBeCloseTo(299.71, 1);
  expect(totalPaid).toBeCloseTo(monthlyPayment * 36, 6);
  expect(totalInterest).toBeCloseTo(totalPaid - 10_000, 6);
});

test('zero interest rate divides principal evenly across the term', () => {
  const { monthlyPayment, totalInterest } = amortize(12_000, 0, 24);
  expect(monthlyPayment).toBeCloseTo(500, 6);
  expect(totalInterest).toBeCloseTo(0, 6);
});

test('non-positive principal or term produces no payment', () => {
  expect(amortize(0, 5, 36)).toEqual({ monthlyPayment: 0, totalInterest: 0, totalPaid: 0 });
  expect(amortize(10_000, 5, 0)).toEqual({ monthlyPayment: 0, totalInterest: 0, totalPaid: 0 });
});
