import { useQuery } from '@tanstack/react-query';
import type { PriceVerdict } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface PriceCheckItem {
  id: string;
  repairDescription: string;
  quotedPrice: number;
  typicalLowCost: number;
  typicalHighCost: number;
  verdict: PriceVerdict;
  explanation: string;
  createdAt: string;
}

interface PriceCheckRow {
  id: string;
  repair_description: string;
  quoted_price: number;
  typical_low_cost: number;
  typical_high_cost: number;
  verdict: PriceVerdict;
  explanation: string;
  created_at: string;
}

export async function savePriceCheck(
  vehicleId: string,
  repairDescription: string,
  quotedPrice: number,
  typicalLowCost: number,
  typicalHighCost: number,
  verdict: PriceVerdict,
  explanation: string,
): Promise<void> {
  const { error } = await supabase.from('price_checks').insert({
    vehicle_id: vehicleId,
    repair_description: repairDescription,
    quoted_price: quotedPrice,
    typical_low_cost: typicalLowCost,
    typical_high_cost: typicalHighCost,
    verdict,
    explanation,
  });

  if (error) throw error;
}

export async function fetchPriceChecks(vehicleId: string): Promise<PriceCheckItem[]> {
  const { data, error } = await supabase
    .from('price_checks')
    .select('id, repair_description, quoted_price, typical_low_cost, typical_high_cost, verdict, explanation, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as PriceCheckRow[]).map((row) => ({
    id: row.id,
    repairDescription: row.repair_description,
    quotedPrice: row.quoted_price,
    typicalLowCost: row.typical_low_cost,
    typicalHighCost: row.typical_high_cost,
    verdict: row.verdict,
    explanation: row.explanation,
    createdAt: row.created_at,
  }));
}

export function usePriceChecks(vehicleId: string) {
  return useQuery({
    queryKey: ['priceChecks', vehicleId],
    queryFn: () => fetchPriceChecks(vehicleId),
    enabled: Boolean(vehicleId),
  });
}
