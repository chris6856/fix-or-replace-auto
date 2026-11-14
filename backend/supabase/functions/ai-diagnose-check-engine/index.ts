// Check Engine Light Assistant: the owner enters diagnostic trouble codes
// (e.g. "P0300, P0171") and whether the light is flashing, Claude suggests
// plausible causes to bring to a mechanic. A sibling of ai-diagnose-symptom
// -- same framing discipline (never a diagnosis, never a cost estimate,
// always flag safety) -- but with one extra hard rule specific to DTCs:
// a code indicates a detected CONDITION, not necessarily a failed PART, so
// this must never read as "replace X" without professional testing.
//
// The flashing-light warning is deliberately NOT part of this function at
// all -- a flashing check engine light has one unambiguous, universal
// meaning (stop driving soon, risk of catalytic converter damage), so the
// client renders that warning itself whenever isFlashing is true,
// guaranteed even if this call is slow or fails. Don't add flashing
// guidance here; it would be redundant and, if this call ever errors,
// absent exactly when it matters most.
//
// Requires the ANTHROPIC_API_KEY secret (shared with ai-diagnose-symptom /
// ai-extract-repair / ai-explain / ai-check-repair-price -- no new setup
// needed if those are already deployed).
// Deploy with:
//   supabase functions deploy ai-diagnose-check-engine

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

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
            cause: {
              type: 'string',
              description: "Short name of the possible cause, e.g. 'Worn spark plug'.",
            },
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
          'could plausibly involve a safety-critical system, or a condition that gets worse or more expensive the ' +
          'longer the vehicle is driven (e.g. a misfire code risking catalytic converter damage), one short ' +
          'direct sentence urging prompt attention. Null only when nothing suggests urgency. Do not mention a ' +
          'flashing light here -- that is handled separately.',
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
    const { vehicleDescription, dtcCodes, isFlashing, symptomNotes } =
      (await req.json()) as DiagnoseCheckEngineRequest;

    if (!Array.isArray(dtcCodes) || dtcCodes.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one diagnostic trouble code is required.' }), {
        status: 400,
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
    console.error('ai-diagnose-check-engine error:', error);
    return new Response(JSON.stringify({ error: 'Could not check these codes right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
