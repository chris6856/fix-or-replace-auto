// Structures a repair shop's free-text description (Screen 10) into clean
// data for the Confirm Repair screen (Screen 11). Claude only extracts what
// was said -- the calc engine and the user's own entered cost are the
// source of truth for everything financial ("AI explains, your algorithm
// decides" -- see claude.md.txt).
//
// Requires the ANTHROPIC_API_KEY secret to be set on this project:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Deploy with:
//   supabase functions deploy ai-extract-repair

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const REPAIR_EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'structure_repair_estimate',
  description: "Structure a car repair shop's description into a short category, a safety flag, and a one-sentence summary.",
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description:
          "A short repair category, e.g. 'Suspension Repair', 'Brakes', 'AC Compressor', 'Engine', 'Transmission', 'Cooling System', 'Electrical', 'Other'.",
      },
      isSafetyIssue: {
        type: ['boolean', 'null'],
        description: "true if the shop said the vehicle is unsafe to drive, false if they said it's safe, null if not mentioned.",
      },
      notes: {
        type: 'string',
        description: "One short plain-language sentence summarizing what's being repaired.",
      },
    },
    required: ['category', 'isSafetyIssue', 'notes'],
    additionalProperties: false,
  },
};

interface ExtractionResult {
  category: string;
  isSafetyIssue: boolean | null;
  notes: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'You structure what a repair shop told a car owner into clean data for an app. ' +
        'Only use information explicitly present in the description -- never guess a cost ' +
        "(the owner enters that separately) and never invent a safety determination the shop " +
        "didn't state; use null for isSafetyIssue when it's not mentioned.",
      tools: [REPAIR_EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'structure_repair_estimate' },
      messages: [{ role: 'user', content: description }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new Error('Claude did not return a structured result');
    }

    const result = toolUse.input as ExtractionResult;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-extract-repair error:', error);
    return new Response(JSON.stringify({ error: 'Could not structure this repair description.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
