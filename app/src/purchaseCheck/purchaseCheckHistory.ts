import { useQuery } from '@tanstack/react-query';
import type { PurchaseVerdict } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface PurchaseCheckItem {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  zip: string;
  askingPrice: number;
  marketValue: number;
  valueLow: number;
  valueHigh: number;
  verdict: PurchaseVerdict;
  createdAt: string;
}

interface PurchaseCheckRow {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  zip: string;
  asking_price: number;
  market_value: number;
  value_low: number;
  value_high: number;
  verdict: PurchaseVerdict;
  created_at: string;
}

export async function savePurchaseCheck(input: {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  zip: string;
  askingPrice: number;
  marketValue: number;
  valueLow: number;
  valueHigh: number;
  verdict: PurchaseVerdict;
}): Promise<void> {
  const { error } = await supabase.from('purchase_checks').insert({
    vin: input.vin,
    year: input.year,
    make: input.make,
    model: input.model,
    trim: input.trim,
    mileage: input.mileage,
    zip: input.zip,
    asking_price: input.askingPrice,
    market_value: input.marketValue,
    value_low: input.valueLow,
    value_high: input.valueHigh,
    verdict: input.verdict,
  });

  if (error) throw error;
}

export async function fetchPurchaseChecks(): Promise<PurchaseCheckItem[]> {
  const { data, error } = await supabase
    .from('purchase_checks')
    .select(
      'id, vin, year, make, model, trim, mileage, zip, asking_price, market_value, value_low, value_high, verdict, created_at',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as PurchaseCheckRow[]).map((row) => ({
    id: row.id,
    vin: row.vin,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    mileage: row.mileage,
    zip: row.zip,
    askingPrice: row.asking_price,
    marketValue: row.market_value,
    valueLow: row.value_low,
    valueHigh: row.value_high,
    verdict: row.verdict,
    createdAt: row.created_at,
  }));
}

export function usePurchaseChecks() {
  return useQuery({
    queryKey: ['purchaseChecks'],
    queryFn: fetchPurchaseChecks,
  });
}
