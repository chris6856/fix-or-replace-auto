import { useQuery } from '@tanstack/react-query';
import type { Recommendation } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface DecisionHistoryItem {
  id: string;
  recommendation: Recommendation;
  category: string;
  cost: number;
  createdAt: string;
}

interface DecisionRow {
  id: string;
  recommendation: Recommendation;
  created_at: string;
  repair_events: { category: string; cost: number } | null;
}

export async function fetchDecisionHistory(vehicleId: string): Promise<DecisionHistoryItem[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select('id, recommendation, created_at, repair_events(category, cost)')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as DecisionRow[]).map((row) => ({
    id: row.id,
    recommendation: row.recommendation,
    category: row.repair_events?.category ?? 'Repair',
    cost: row.repair_events?.cost ?? 0,
    createdAt: row.created_at,
  }));
}

export function useDecisionHistory(vehicleId: string) {
  return useQuery({
    queryKey: ['decisions', vehicleId],
    queryFn: () => fetchDecisionHistory(vehicleId),
    enabled: Boolean(vehicleId),
  });
}

/** Sum of repair costs from decisions saved within the trailing 12 months --
 *  feeds Screen 12's "We have $X in repairs recorded" pre-fill. */
export function sumRecentRepairs(history: DecisionHistoryItem[]): number {
  const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return history
    .filter((item) => new Date(item.createdAt).getTime() >= twelveMonthsAgo)
    .reduce((sum, item) => sum + item.cost, 0);
}
