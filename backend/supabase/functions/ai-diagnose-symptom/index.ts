// Symptom Check: the owner describes a symptom (e.g. "grinding noise when
// braking"), Claude suggests plausible causes to bring to a mechanic. This
// is meaningfully different from ai-extract-repair, which only interprets
// a diagnosis a professional has ALREADY made -- here Claude is generating
// candidate causes itself, so the framing has to work much harder to stay
// on the right side of "possibilities to ask a mechanic about" and never
// read as a diagnosis or a cost estimate. No cost figure is ever
// requested or returned from this function.
//
// Requires the ANTHROPIC_API_KEY secret (shared with ai-extract-repair /
// ai-explain -- no new setup needed if those are already deployed).
// Deploy with:
//   supabase functions deploy ai-diagnose-symptom

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const DIAGNOSE_SYMPTOM_TOOL: Anthropic.Tool = {
  name: 'suggest_possible_causes',
  description:
    'Suggest a short, ranked list of plausible causes for a symptom a car owner described, for a mechanic to ' +
    'investigate. Never a diagnosis, never a cost estimate.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      possibleIssues: {
        type: 'array',
        description: 'Between 1 and 5 possible causes, most likely first.',
        items: {
          type: 'object',
          properties: {
            cause: {
              type: 'string',
              description: "Short name of the possible cause, e.g. 'Worn front brake pads'.",
            },
            likelihood: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'How commonly this symptom pattern points to this specific cause.',
            },
            isSafetyIssue: {
              type: 'boolean',
              description: 'true if, when this specific cause turns out to be right, driving on it is unsafe.',
            },
            explanation: {
              type: 'string',
              description: 'One short plain-language sentence on why this symptom suggests this cause.',
            },
          },
          required: ['cause', 'likelihood', 'isSafetyIssue', 'explanation'],
          additionalProperties: false,
        },
      },
      urgentSafetyNote: {
        type: ['string', 'null'],
        description:
          'If the symptom ITSELF -- regardless of which specific cause turns out to be right -- could plausibly ' +
          "involve a safety-critical system (brakes, steering, tires, suspension), one short direct sentence " +
          'telling the owner to get it inspected promptly rather than wait. Null only when nothing about the ' +
          'symptom suggests urgency.',
      },
    },
    required: ['possibleIssues', 'urgentSafetyNote'],
    additionalProperties: false,
  },
};

interface DiagnoseSymptomRequest {
  vehicleDescription: string;
  symptomDescription: string;
}

interface DiagnoseSymptomResult {
  possibleIssues: {
    cause: string;
    likelihood: 'low' | 'medium' | 'high';
    isSafetyIssue: boolean;
    explanation: string;
  }[];
  urgentSafetyNote: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vehicleDescription, symptomDescription } = (await req.json()) as DiagnoseSymptomRequest;
    if (!symptomDescription || typeof symptomDescription !== 'string' || symptomDescription.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'symptomDescription is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'You help a car owner think through what might be causing a symptom they noticed, before they talk to a ' +
        'mechanic. You are NOT diagnosing the vehicle and must never claim certainty -- frame every cause as a ' +
        "possibility for a mechanic to check, ranked by how commonly it explains this kind of symptom. Never " +
        'suggest a repair cost or dollar amount under any circumstance. If the symptom could plausibly involve ' +
        'brakes, steering, tires, or suspension, mark those causes as safety issues and always fill in ' +
        'urgentSafetyNote urging a prompt inspection regardless of which specific cause turns out to be right -- ' +
        'when in doubt about safety, err toward flagging it.',
      tools: [DIAGNOSE_SYMPTOM_TOOL],
      tool_choice: { type: 'tool', name: 'suggest_possible_causes' },
      messages: [
        {
          role: 'user',
          content: `Vehicle: ${vehicleDescription}\n\nSymptom: ${symptomDescription}`,
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new Error('Claude did not return a structured result');
    }

    const result = toolUse.input as DiagnoseSymptomResult;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-diagnose-symptom error:', error);
    return new Response(JSON.stringify({ error: 'Could not check this symptom right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
