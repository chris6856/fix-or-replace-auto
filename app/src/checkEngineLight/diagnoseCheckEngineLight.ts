import type { DiyDifficulty, IssueLikelihood } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface DiagnoseCheckEngineResult {
  possibleCauses: {
    cause: string;
    likelihood: IssueLikelihood;
    isSafetyIssue: boolean;
    diyDifficulty: DiyDifficulty;
    explanation: string;
  }[];
  urgentSafetyNote: string | null;
}

/**
 * Calls the ai-diagnose-check-engine Edge Function. No manual-entry
 * fallback makes sense here -- Claude IS the feature -- so this throws on
 * failure rather than returning null, same as diagnoseSymptom.ts.
 */
export async function diagnoseCheckEngineLight(
  vehicleDescription: string,
  dtcCodes: string[],
  isFlashing: boolean,
  symptomNotes: string | null,
): Promise<DiagnoseCheckEngineResult> {
  const { data, error } = await supabase.functions.invoke<DiagnoseCheckEngineResult & { error?: string }>(
    'ai-diagnose-check-engine',
    { body: { vehicleDescription, dtcCodes, isFlashing, symptomNotes: symptomNotes ?? undefined } },
  );

  if (error || !data || data.error) {
    throw new Error(data?.error ?? error?.message ?? 'Could not check these codes right now.');
  }

  return data;
}
