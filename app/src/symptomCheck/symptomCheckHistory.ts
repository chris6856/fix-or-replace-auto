import { useQuery } from '@tanstack/react-query';
import type { PossibleIssue } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

export interface SymptomCheckItem {
  id: string;
  symptomDescription: string;
  possibleIssues: PossibleIssue[];
  urgentSafetyNote: string | null;
  createdAt: string;
}

interface SymptomCheckRow {
  id: string;
  symptom_description: string;
  possible_issues: PossibleIssue[];
  urgent_safety_note: string | null;
  created_at: string;
}

export async function saveSymptomCheck(
  vehicleId: string,
  symptomDescription: string,
  possibleIssues: PossibleIssue[],
  urgentSafetyNote: string | null,
): Promise<void> {
  const { error } = await supabase.from('symptom_checks').insert({
    vehicle_id: vehicleId,
    symptom_description: symptomDescription,
    possible_issues: possibleIssues,
    urgent_safety_note: urgentSafetyNote,
  });

  if (error) throw error;
}

export async function fetchSymptomChecks(vehicleId: string): Promise<SymptomCheckItem[]> {
  const { data, error } = await supabase
    .from('symptom_checks')
    .select('id, symptom_description, possible_issues, urgent_safety_note, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as SymptomCheckRow[]).map((row) => ({
    id: row.id,
    symptomDescription: row.symptom_description,
    possibleIssues: row.possible_issues,
    urgentSafetyNote: row.urgent_safety_note,
    createdAt: row.created_at,
  }));
}

export function useSymptomChecks(vehicleId: string) {
  return useQuery({
    queryKey: ['symptomChecks', vehicleId],
    queryFn: () => fetchSymptomChecks(vehicleId),
    enabled: Boolean(vehicleId),
  });
}
