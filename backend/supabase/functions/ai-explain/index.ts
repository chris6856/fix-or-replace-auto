// Generates the plain-language "Why" explanation for Screen 26. Claude is
// given only the already-computed numbers and the recommendation the
// deterministic calc engine already decided -- "AI explains, your
// algorithm decides" (claude.md.txt). It must never be asked to pick the
// recommendation itself.
//
// Requires the ANTHROPIC_API_KEY secret (already set for ai-extract-repair
// if that's deployed -- same secret, no new setup needed there).
// Deploy with:
//   supabase functions deploy ai-explain

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

interface ExplainRequest {
  vehicleDescription: string;
  repairCategory: string;
  recommendation: 'fix' | 'get_quote' | 'replace' | 'too_close';
  currentRepairCost: number;
  recentRepairsSum: number;
  ageYears: number;
  mileage: number;
  reliabilityBucket: 'reliable' | 'some_problems' | 'problem_vehicle';
  netReplacementAcquisitionCost: number;
  repairThreshold: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ExplainRequest;

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 500,
      output_config: { effort: 'low' },
      system:
        'You explain a car repair-vs-replace financial decision to a car owner in plain, direct language. ' +
        'A deterministic algorithm has ALREADY decided the recommendation given below -- your only job is to ' +
        'explain why, in 2-4 short sentences, referencing the specific dollar amounts given. Never suggest a ' +
        'different recommendation than the one given, and never invent numbers not provided. When relevant, ' +
        "mention what could change the picture (e.g. if more repairs turn out to be needed soon). Don't use " +
        'bullet points -- write it as flowing prose, matching the tone of a knowledgeable friend, not a report.',
      messages: [
        {
          role: 'user',
          content: JSON.stringify(body),
        },
      ],
    });

    const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude did not return an explanation');
    }

    return new Response(JSON.stringify({ explanation: textBlock.text.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-explain error:', error);
    return new Response(JSON.stringify({ error: 'Could not generate an explanation.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
