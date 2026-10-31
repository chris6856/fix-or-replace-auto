// Price Check for anonymous website visitors -- same two-call web-search-
// grounded logic as ai-check-repair-price (see that function's comments
// for why there's no licensed pricing API and why this is a two-call
// design), duplicated here rather than shared across the app/web boundary
// (same reasoning as verify-purchase/verify-web-purchase elsewhere in this
// project). The one real difference: no Supabase Auth, no owned vehicle --
// vehicleDescription is free text the visitor types -- and it's gated by a
// Cloudflare Turnstile token (cheap, unlike the Claude calls it protects)
// verified server-side before any paid API call runs.
//
// Requires these secrets:
//   supabase secrets set ANTHROPIC_API_KEY=...   (shared with ai-check-repair-price)
//   supabase secrets set TURNSTILE_SECRET_KEY=... (shared with check-web-purchase-price)
// Deploy with:
//   supabase functions deploy check-web-repair-price

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

const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 3,
};

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
    console.error('check-web-repair-price research pass failed, continuing without it:', error);
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
  turnstileToken: string;
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
    if (!TURNSTILE_SECRET_KEY) {
      throw new Error('Server is not configured');
    }

    const { vehicleDescription, repairDescription, quotedPrice, turnstileToken } =
      (await req.json()) as CheckPriceRequest;

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
    if (!repairDescription || typeof repairDescription !== 'string' || repairDescription.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Describe the repair.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof quotedPrice !== 'number' || !Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      return new Response(JSON.stringify({ error: 'Enter the quoted price.' }), {
        status: 422,
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
    console.error('check-web-repair-price error:', error);
    return new Response(JSON.stringify({ error: 'Could not check this price right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
