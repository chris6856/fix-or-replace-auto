// Check Engine Light Assistant for anonymous website visitors -- same
// logic as ai-diagnose-check-engine (see that function's comments for the
// framing rules), duplicated here rather than shared across the app/web
// boundary (same reasoning as verify-purchase/verify-web-purchase and
// ai-check-repair-price/check-web-repair-price elsewhere in this project).
// No Supabase Auth, no owned vehicle -- vehicleDescription is free text
// the visitor types -- gated by a Cloudflare Turnstile token (cheap,
// unlike the Claude call it protects) verified server-side first.
//
// Requires these secrets:
//   supabase secrets set ANTHROPIC_API_KEY=...   (shared with ai-diagnose-check-engine)
//   supabase secrets set TURNSTILE_SECRET_KEY=... (shared with check-web-repair-price / check-web-purchase-price)
// Deploy with:
//   supabase functions deploy check-web-engine-light --no-verify-jwt

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY');

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY || !token) return false;
  const body = new URLSearchParams();
  body.set('secret', TURNSTILE_SECRET_KEY);
  body.set('response', token);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) return false;

  const result = (await response.json()) as { success: boolean };
  return result.success === true;
}

const DIAGNOSE_CHECK_ENGINE_TOOL: Anthropic.Tool = {
  name: 'suggest_engine_light_causes',
  description:
    'Suggest a short, ranked list of plausible causes for a set of diagnostic trouble codes, for a mechanic to ' +
    'investigate. Never a diagnosis, never a cost estimate.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      possibleCauses: {
        type: 'array',
        description: 'Between 1 and 5 possible causes, most likely first.',
        items: {
          type: 'object',
          properties: {
            cause: { type: 'string', description: "Short name of the possible cause, e.g. 'Worn spark plug'." },
            likelihood: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'How commonly these codes point to this specific cause.',
            },
            isSafetyIssue: {
              type: 'boolean',
              description: 'true if, when this specific cause turns out to be right, driving on it is unsafe.',
            },
            diyDifficulty: {
              type: 'string',
              enum: ['easy', 'moderate', 'difficult', 'professional_only'],
              description: 'How difficult diagnosing/fixing THIS specific cause would be for an owner to attempt.',
            },
            explanation: {
              type: 'string',
              description: 'One short plain-language sentence on why these codes suggest this cause.',
            },
          },
          required: ['cause', 'likelihood', 'isSafetyIssue', 'diyDifficulty', 'explanation'],
          additionalProperties: false,
        },
      },
      urgentSafetyNote: {
        type: ['string', 'null'],
        description:
          'If these codes or symptoms ITSELF -- regardless of which specific cause turns out to be right -- ' +
          'could plausibly involve a safety-critical system, or a condition that gets worse or more expensive ' +
          'the longer the vehicle is driven, one short direct sentence urging prompt attention. Null only when ' +
          'nothing suggests urgency. Do not mention a flashing light here -- that is handled separately.',
      },
    },
    required: ['possibleCauses', 'urgentSafetyNote'],
    additionalProperties: false,
  },
};

interface DiagnoseCheckEngineRequest {
  vehicleDescription: string;
  dtcCodes: string[];
  isFlashing: boolean;
  symptomNotes?: string;
  turnstileToken: string;
}

interface DiagnoseCheckEngineResult {
  possibleCauses: {
    cause: string;
    likelihood: 'low' | 'medium' | 'high';
    isSafetyIssue: boolean;
    diyDifficulty: 'easy' | 'moderate' | 'difficult' | 'professional_only';
    explanation: string;
  }[];
  urgentSafetyNote: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TURNSTILE_SECRET_KEY) {
      throw new Error('Server is not configured');
    }

    const { vehicleDescription, dtcCodes, isFlashing, symptomNotes, turnstileToken } =
      (await req.json()) as DiagnoseCheckEngineRequest;

    if (!(await verifyTurnstile(turnstileToken))) {
      return new Response(JSON.stringify({ error: 'Verification failed. Please try again.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vehicleDescription || !vehicleDescription.trim()) {
      return new Response(JSON.stringify({ error: 'Enter the vehicle (year, make, model).' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(dtcCodes) || dtcCodes.length === 0) {
      return new Response(JSON.stringify({ error: 'Enter at least one diagnostic trouble code.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const codesText = dtcCodes.join(', ');
    const userContent =
      `Vehicle: ${vehicleDescription}\n\nDiagnostic trouble codes: ${codesText}\n\nLight flashing: ${isFlashing ? 'yes' : 'no'}` +
      (symptomNotes && symptomNotes.trim() ? `\n\nOwner's notes: ${symptomNotes.trim()}` : '');

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'You help a car owner think through what might be causing the diagnostic trouble codes their check ' +
        'engine light triggered, before they talk to a mechanic. You are NOT diagnosing the vehicle and must ' +
        'never claim certainty -- frame every cause as a possibility for a mechanic to check, ranked by how ' +
        'commonly it explains these codes. A code indicates a detected condition, not necessarily a failed part ' +
        '-- never recommend replacing a specific component without professional testing to confirm it first. ' +
        'Never suggest a repair cost or dollar amount under any circumstance. Flag isSafetyIssue per cause, and ' +
        'always fill in urgentSafetyNote when these codes or symptoms could plausibly involve a safety-critical ' +
        'system or a condition that worsens the longer the vehicle keeps being driven -- when in doubt about ' +
        'safety, err toward flagging it. Do not mention a flashing light in urgentSafetyNote; that is handled ' +
        'separately by the app regardless of what you return.',
      tools: [DIAGNOSE_CHECK_ENGINE_TOOL],
      tool_choice: { type: 'tool', name: 'suggest_engine_light_causes' },
      messages: [{ role: 'user', content: userContent }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new Error('Claude did not return a structured result');
    }

    const result = toolUse.input as DiagnoseCheckEngineResult;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('check-web-engine-light error:', error);
    return new Response(JSON.stringify({ error: 'Could not check these codes right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
