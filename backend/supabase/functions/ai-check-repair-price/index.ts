// Price Check: the owner enters an already-diagnosed repair (e.g. "brake
// job, new rotors and pads") and the price a shop quoted, and Claude says
// whether that looks typical. Unlike ai-diagnose-symptom and
// ai-extract-repair -- neither of which ever returns a dollar figure --
// this function's whole job IS a cost judgment, so it leans hard on the
// most honest framing available: always a LOW-HIGH range, never a single
// number, and the verdict is always relative to that range rather than a
// bare "fair"/"unfair" claim.
//
// There's no licensed labor-time/parts-pricing API in this project (Mitchell1,
// ALLDATA, MOTOR, and RepairPal's own Fair Price Estimator are all partner/
// business-development-only, not self-serve developer APIs -- checked
// 2026-10-30), so this leans on Claude's built-in web_search tool instead of
// pure training-data recall: a first, UNFORCED call lets Claude search for
// current published repair-cost references, then a second call -- using the
// existing forced-tool pattern, which this model still supports -- turns
// those findings into the structured range/verdict. Forcing the structured
// tool on the FIRST call would make searching impossible (a forced
// tool_choice can't also leave room for an earlier web_search call), hence
// the two-call split. If the research call fails for any reason, this falls
// back to Claude's own general knowledge rather than failing the whole
// request -- search is a grounding upgrade, not a hard dependency.
//
// Requires the ANTHROPIC_API_KEY secret (shared with ai-diagnose-symptom /
// ai-extract-repair / ai-explain -- no new setup needed if those are
// already deployed).
// Deploy with:
//   supabase functions deploy ai-check-repair-price

import Anthropic from 'npm:@anthropic-ai/sdk@0.122.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 3,
};

/**
 * Unforced research pass: lets Claude decide to search the web for current
 * published repair-cost references (RepairPal, YourMechanic, repair
 * forums, etc.) before the structured judgment call. tool_choice "any"
 * forces it to use the one tool available (web_search) at least once,
 * rather than silently skipping straight to a from-memory answer. Returns
 * the final text summary, or null if the call fails or Claude never
 * produced one -- callers fall back to no-research grounding either way.
 */
async function researchTypicalCost(vehicleDescription: string, repairDescription: string): Promise<string | null> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        "Search the web for current, published typical cost references for the car owner's described repair on " +
        'their vehicle (sites like RepairPal, YourMechanic, Kelley Blue Book, or repair-shop/forum discussions ' +
        'are good sources). Then write a short plain-text summary (3-5 sentences) of what you found: any dollar ' +
        'figures or ranges mentioned, which sources they came from, and any factors those sources cite that ' +
        'affect the price (parts, labor rates, region, shop type). If search turns up nothing useful, say so ' +
        'plainly rather than inventing figures.',
      tools: [WEB_SEARCH_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Vehicle: ${vehicleDescription}\n\nRepair: ${repairDescription}`,
        },
      ],
    });

    const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    return textBlock?.text ?? null;
  } catch (error) {
    console.error('ai-check-repair-price research pass failed, continuing without it:', error);
    return null;
  }
}

const CHECK_PRICE_TOOL: Anthropic.Tool = {
  name: 'check_repair_price',
  description:
    'Judge whether a quoted repair price looks typical, using general knowledge of U.S. repair costs. Always a ' +
    'range, never a single number.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      typicalLowCost: {
        type: 'number',
        description: 'Low end of the typical cost range in USD for this repair on this vehicle.',
      },
      typicalHighCost: {
        type: 'number',
        description: 'High end of the typical cost range in USD for this repair on this vehicle.',
      },
      verdict: {
        type: 'string',
        enum: ['below_typical', 'within_typical', 'above_typical'],
        description: 'Where the quoted price falls relative to the typical range.',
      },
      explanation: {
        type: 'string',
        description:
          'One to two short sentences naming at least one concrete factor (parts, labor rates, shop type) ' +
          'relevant to this verdict, so the owner has something specific to ask about.',
      },
    },
    required: ['typicalLowCost', 'typicalHighCost', 'verdict', 'explanation'],
    additionalProperties: false,
  },
};

interface CheckPriceRequest {
  vehicleDescription: string;
  repairDescription: string;
  quotedPrice: number;
}

interface CheckPriceResult {
  typicalLowCost: number;
  typicalHighCost: number;
  verdict: 'below_typical' | 'within_typical' | 'above_typical';
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vehicleDescription, repairDescription, quotedPrice } = (await req.json()) as CheckPriceRequest;
    if (!repairDescription || typeof repairDescription !== 'string' || repairDescription.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'repairDescription is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof quotedPrice !== 'number' || !Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      return new Response(JSON.stringify({ error: 'quotedPrice must be a positive number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const research = await researchTypicalCost(vehicleDescription, repairDescription);

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'You help a car owner judge whether a price a repair shop quoted them looks reasonable. When web research ' +
        'findings are provided below, ground your range in them and say so in your explanation; otherwise fall ' +
        'back to your general knowledge of typical U.S. repair costs and make clear you have no access to ' +
        'real-time, local, or regional pricing data. Either way, frame your answer as a rough general reference ' +
        'point, never a verdict on this specific shop or transaction. Always express the typical cost as a ' +
        'LOW-HIGH range, never a single number, reflecting that labor rates, parts quality (OEM vs aftermarket), ' +
        'vehicle age/complexity, and region all cause real variation. Classify the quoted price as ' +
        'below_typical, within_typical, or above_typical relative to that range. In your explanation, name at ' +
        'least one concrete factor relevant to this verdict, so the owner has something specific to ask about ' +
        'rather than just a verdict.',
      tools: [CHECK_PRICE_TOOL],
      tool_choice: { type: 'tool', name: 'check_repair_price' },
      messages: [
        {
          role: 'user',
          content:
            `Vehicle: ${vehicleDescription}\n\nRepair: ${repairDescription}\n\nQuoted price: $${quotedPrice}` +
            (research ? `\n\nWeb research findings:\n${research}` : '\n\n(Web research was unavailable for this check.)'),
        },
      ],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new Error('Claude did not return a structured result');
    }

    const result = toolUse.input as CheckPriceResult;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-check-repair-price error:', error);
    return new Response(JSON.stringify({ error: 'Could not check this price right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
