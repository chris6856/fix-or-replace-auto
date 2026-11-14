import { useQuery } from '@tanstack/react-query';
import type { EngineLightCause } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface CheckEngineLightItem {
  id: string;
  dtcCodes: string[];
  isFlashing: boolean;
  symptomNotes: string | null;
  possibleCauses: EngineLightCause[];
  urgentSafetyNote: string | null;
  createdAt: string;
}

interface CheckEngineLightRow {
  id: string;
  dtc_codes: string[];
  is_flashing: boolean;
  symptom_notes: string | null;
  possible_causes: EngineLightCause[];
  urgent_safety_note: string | null;
  created_at: string;
}

export async function saveCheckEngineCheck(
  vehicleId: string,
  dtcCodes: string[],
  isFlashing: boolean,
  symptomNotes: string | null,
  possibleCauses: EngineLightCause[],
  urgentSafetyNote: string | null,
): Promise<void> {
  const { error } = await supabase.from('check_engine_checks').insert({
    vehicle_id: vehicleId,
    dtc_codes: dtcCodes,
    is_flashing: isFlashing,
    symptom_notes: symptomNotes,
    possible_causes: possibleCauses,
    urgent_safety_note: urgentSafetyNote,
  });

  if (error) throw error;
}

export async function fetchCheckEngineChecks(vehicleId: string): Promise<CheckEngineLightItem[]> {
  const { data, error } = await supabase
    .from('check_engine_checks')
    .select('id, dtc_codes, is_flashing, symptom_notes, possible_causes, urgent_safety_note, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as CheckEngineLightRow[]).map((row) => ({
    id: row.id,
    dtcCodes: row.dtc_codes,
    isFlashing: row.is_flashing,
    symptomNotes: row.symptom_notes,
    possibleCauses: row.possible_causes,
    urgentSafetyNote: row.urgent_safety_note,
    createdAt: row.created_at,
  }));
}

export function useCheckEngineChecks(vehicleId: string) {
  return useQuery({
    queryKey: ['checkEngineChecks', vehicleId],
    queryFn: () => fetchCheckEngineChecks(vehicleId),
    enabled: Boolean(vehicleId),
  });
}
