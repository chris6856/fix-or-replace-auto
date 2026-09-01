import type { PossibleIssue } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface DiagnoseSymptomResult {
  possibleIssues: PossibleIssue[];
  urgentSafetyNote: string | null;
}

/**
 * Calls the ai-diagnose-symptom Edge Function. Unlike ai-extract-repair,
 * there's no manual-entry fallback that makes sense here -- Claude IS the
 * feature -- so this throws on failure rather than returning null, and the
 * screen shows the error directly.
 */
export async function diagnoseSymptom(
  vehicleDescription: string,
  symptomDescription: string,
): Promise<DiagnoseSymptomResult> {
  const { data, error } = await supabase.functions.invoke<DiagnoseSymptomResult & { error?: string }>(
    'ai-diagnose-symptom',
    { body: { vehicleDescription, symptomDescription } },
  );

  if (error || !data || data.error) {
    throw new Error(data?.error ?? error?.message ?? 'Could not check this symptom right now.');
  }

  return data;
}
