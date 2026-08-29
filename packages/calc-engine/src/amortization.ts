export interface AmortizationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
}

/** Standard fixed-rate loan amortization. Pure and I/O-free. */
export function amortize(principal: number, annualRatePct: number, termMonths: number): AmortizationResult {
  if (principal <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalPaid: 0 };
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  const totalPaid = monthlyPayment * termMonths;
  const totalInterest = totalPaid - principal;

  return { monthlyPayment, totalInterest, totalPaid };
}
