/**
 * Deterministic, category-templated -- the blueprint's own question list
 * only varies by one word ("which [category] components"), so this
 * doesn't need an AI call the way ai-explain does.
 */
export function buildMechanicQuestions(repairCategory: string, repairCost: number): string[] {
  const categoryLower = repairCategory.toLowerCase();
  return [
    `Is $${Math.round(repairCost).toLocaleString()} the complete out-the-door repair price?`,
    `Which ${categoryLower} components are being replaced?`,
    'Which repairs are necessary now?',
    'Are any items recommendations rather than required repairs?',
    'What parts and labor warranty is included?',
    'Do you see any other major repairs likely soon?',
  ];
}
