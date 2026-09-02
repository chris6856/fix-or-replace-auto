import { supabase } from '../lib/supabase';

/**
 * Calls the email-report Edge Function. There's no manual-entry fallback
 * for this one -- it either sends or it doesn't -- so this throws on
 * failure and the caller shows the error directly.
 */
export async function emailReport(decisionId: string): Promise<{ sentTo: string }> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean; sentTo: string; error?: string }>(
    'email-report',
    { body: { decisionId } },
  );

  if (error || !data || data.error || !data.success) {
    throw new Error(data?.error ?? error?.message ?? 'Could not email this report right now.');
  }

  return { sentTo: data.sentTo };
}
