import type { PriceVerdict } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface CheckRepairPriceResult {
  typicalLowCost: number;
  typicalHighCost: number;
  verdict: PriceVerdict;
  explanation: string;
}

/**
 * Calls the ai-check-repair-price Edge Function. Unlike ai-extract-repair,
 * there's no manual-entry fallback that makes sense here -- Claude IS the
 * feature -- so this throws on failure rather than returning null, and the
 * screen shows the error directly.
 */
export async function checkRepairPrice(
  vehicleDescription: string,
  repairDescription: string,
  quotedPrice: number,
): Promise<CheckRepairPriceResult> {
  const { data, error } = await supabase.functions.invoke<CheckRepairPriceResult & { error?: string }>(
    'ai-check-repair-price',
    { body: { vehicleDescription, repairDescription, quotedPrice } },
  );

  if (error || !data || data.error) {
    throw new Error(data?.error ?? error?.message ?? 'Could not check this price right now.');
  }

  return data;
}
