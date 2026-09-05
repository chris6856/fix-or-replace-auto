import type { CalcInput, CalcOutput } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';
import type { DecisionDraft } from './DecisionDraftContext';

/**
 * Screen 28's Save -- the first point in the whole flow that writes
 * anything decision-related to Postgres. Everything before this has been
 * in-memory analysis (see build plan section 5's "session object" design).
 */
export async function saveDecision(
  draft: DecisionDraft,
  input: CalcInput,
  output: CalcOutput,
  aiExplanation: string | null,
): Promise<{ decisionId: string }> {
  const { data: repairEvent, error: repairError } = await supabase
    .from('repair_events')
    .insert({
      vehicle_id: draft.vehicleId,
      description: draft.repairDescriptionRaw || draft.repairCategory || 'Repair',
      category: draft.repairCategory ?? 'General Repair',
      cost: draft.totalRepairEstimate,
      is_safety_issue: draft.isSafetyIssue,
      shop_name: draft.repairShopName,
      source: 'estimate',
    })
    .select('id')
    .single();

  if (repairError) throw repairError;

  const { data: decision, error: decisionError } = await supabase
    .from('decisions')
    .insert({
      vehicle_id: draft.vehicleId,
      repair_event_id: repairEvent.id,
      recommendation: output.recommendation,
      calc_input: input,
      calc_output: output,
      ai_explanation: aiExplanation,
    })
    .select('id')
    .single();

  if (decisionError) throw decisionError;

  return { decisionId: decision.id };
}
