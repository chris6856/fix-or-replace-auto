import type { ValuationCache, VehicleValuationProvider } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

type ValuationResult = Omit<ValuationCache, 'vehicleId' | 'fetchedAt'>;

/**
 * The real vendor adapter (build plan milestone 10), behind the same
 * interface the manual-entry screen was already designed against -- no
 * screen-level changes needed beyond calling this instead of skipping it.
 * Requires the vehicle to have a VIN on file; throws otherwise (and on any
 * network/API failure), which the caller uses as the signal to fall back
 * to manual entry.
 */
export const marketCheckValuationProvider: VehicleValuationProvider = {
  async getValuation(input): Promise<ValuationResult> {
    const { data, error } = await supabase.functions.invoke<ValuationResult & { error?: string }>('valuation-proxy', {
      body: { vin: input.vin, mileage: input.mileage, zip: input.zip },
    });

    if (error || !data || data.error) {
      throw new Error(data?.error ?? error?.message ?? 'Could not fetch a market value for this vehicle.');
    }

    return data;
  },
};
