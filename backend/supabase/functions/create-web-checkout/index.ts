// Creates a Stripe Checkout Session for the website's guest "Already Have
// an Estimate" flow -- the web equivalent of the app's Google Play/Apple
// in-app purchase, since neither of those work outside their own app. No
// Supabase Auth is involved; the visitor is anonymous until (optionally)
// they type an email to receive the full report.
//
// Requires these secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase secrets set WEBSITE_BASE_URL=https://fixorreplaceauto.com
// Deploy with:
//   supabase functions deploy create-web-checkout

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const WEBSITE_BASE_URL = Deno.env.get('WEBSITE_BASE_URL') ?? 'https://fixorreplaceauto.com';

const TIER_CONFIG: Record<string, { amountCents: number; name: string }> = {
  decision: { amountCents: 99, name: 'Fix or Replace Auto -- Your Recommendation' },
  full: { amountCents: 199, name: 'Fix or Replace Auto -- Full Report + Emailed PDF' },
};

interface CheckoutRequest {
  tier: 'decision' | 'full';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Server is not configured');
    }

    const { tier } = (await req.json()) as CheckoutRequest;
    const config = TIER_CONFIG[tier];
    if (!config) {
      return new Response(JSON.stringify({ error: 'Invalid tier.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const successUrl = `${WEBSITE_BASE_URL}/estimate/?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`;
    const cancelUrl = `${WEBSITE_BASE_URL}/estimate/?canceled=1`;

    const body = new URLSearchParams();
    body.set('mode', 'payment');
    body.set('success_url', successUrl);
    body.set('cancel_url', cancelUrl);
    body.set('line_items[0][quantity]', '1');
    body.set('line_items[0][price_data][currency]', 'usd');
    body.set('line_items[0][price_data][unit_amount]', String(config.amountCents));
    body.set('line_items[0][price_data][product_data][name]', config.name);
    body.set('metadata[tier]', tier);

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!stripeResponse.ok) {
      const errorBody = await stripeResponse.text();
      console.error('Stripe checkout session creation failed:', stripeResponse.status, errorBody);
      throw new Error(`Stripe returned ${stripeResponse.status}`);
    }

    const session = (await stripeResponse.json()) as { url: string };

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('create-web-checkout error:', error);
    return new Response(JSON.stringify({ error: 'Could not start checkout right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
