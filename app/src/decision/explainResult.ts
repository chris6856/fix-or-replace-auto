import type { CalcInput, CalcOutput } from '@fixorreplace/types';

/**
 * A short, deterministic explanation for the Result screen (Screen 21's
 * inline text, distinct from the dedicated "Why" screen). This is
 * template-based, not AI-generated -- the real ai-explain Edge Function
 * (Claude-generated, given only the calculated numbers) is milestone 9's
 * Screen 26. "AI explains, your algorithm decides" only applies once that
 * exists; until then this keeps the Result screen self-contained.
 */
export function explainResult(input: CalcInput, output: CalcOutput): string {
  const repairCost = formatCurrency(input.keep.currentRepairCost);
  const netCost = formatCurrency(output.netReplacementAcquisitionCost);

  switch (output.recommendation) {
    case 'fix':
      return `Although the ${repairCost} repair is a real expense, replacing this vehicle would cost roughly ${netCost} once taxes, fees, and financing are included. Keeping it is the stronger financial move right now.`;
    case 'get_quote':
      return `Your ${repairCost} estimate is close to what we'd consider a reasonable ceiling for a vehicle in this condition. It may still be worth repairing, but a second quote could help confirm the price before committing.`;
    case 'replace':
      return `A ${repairCost} repair is more than this vehicle's condition and history can reasonably justify, especially against a net replacement cost of ${netCost}. Replacing it is the stronger financial move here.`;
    case 'too_close':
      return `The ${repairCost} repair and the ${netCost} cost of replacing land close enough together that neither option has a clear financial edge. This one comes down to your own preference.`;
  }
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}
