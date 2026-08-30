import { supabase } from '../lib/supabase';

export interface RepairExtraction {
  category: string;
  isSafetyIssue: boolean | null;
  notes: string;
}

/**
 * Calls the ai-extract-repair Edge Function. Returns null on any failure
 * (including "not deployed yet") rather than throwing -- the Confirm Repair
 * screen falls back to fully manual entry either way, since the shop's
 * estimate itself always came from the user, not from Claude.
 */
export async function extractRepairDetails(description: string): Promise<RepairExtraction | null> {
  try {
    const { data, error } = await supabase.functions.invoke<RepairExtraction>('ai-extract-repair', {
      body: { description },
    });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
