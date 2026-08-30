import type { CalcInput, CalcOutput, ReliabilityBucket } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

interface ExplainPayload {
  vehicleDescription: string;
  repairCategory: string;
  recommendation: CalcOutput['recommendation'];
  currentRepairCost: number;
  recentRepairsSum: number;
  ageYears: number;
  mileage: number;
  reliabilityBucket: ReliabilityBucket;
  netReplacementAcquisitionCost: number;
  repairThreshold: number;
}

export function buildExplainPayload(
  vehicleDescription: string,
  repairCategory: string,
  input: CalcInput,
  output: CalcOutput,
): ExplainPayload {
  return {
    vehicleDescription,
    repairCategory,
    recommendation: output.recommendation,
    currentRepairCost: input.keep.currentRepairCost,
    recentRepairsSum: input.keep.recentRepairsSum,
    ageYears: input.keep.ageYears,
    mileage: input.keep.mileage,
    reliabilityBucket: input.keep.reliabilityBucket,
    netReplacementAcquisitionCost: output.netReplacementAcquisitionCost,
    repairThreshold: output.repairThreshold,
  };
}

/** Returns null on any failure -- the Why screen falls back to the
 *  deterministic explainResult() text either way. */
export async function fetchAiExplanation(payload: ExplainPayload): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ explanation: string }>('ai-explain', {
      body: payload,
    });
    if (error || !data?.explanation) return null;
    return data.explanation;
  } catch {
    return null;
  }
}
