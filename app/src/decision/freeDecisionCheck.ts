import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * A user's very first decision, ever, is free -- everything after that
 * goes through the paywall (see PaywallScreen). Counts across all of a
 * user's vehicles, not per-vehicle, so switching cars doesn't reset it.
 */
export async function hasUsedFreeDecision(): Promise<boolean> {
  const { count, error } = await supabase.from('decisions').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return (count ?? 0) > 0;
}

export function useHasUsedFreeDecision() {
  return useQuery({ queryKey: ['hasUsedFreeDecision'], queryFn: hasUsedFreeDecision });
}
