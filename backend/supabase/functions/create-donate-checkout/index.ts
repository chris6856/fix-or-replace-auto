// Creates a Stripe Checkout Session for a one-time donation -- same rail as
// create-web-checkout (the guest report-purchase flow), but a variable,
// visitor-chosen amount instead of a fixed tier, and nothing to unlock
// afterward (just a thank-you page). No Supabase Auth involved, same as
// every other website payment flow in this project.
//
// Requires these secrets (shared with create-web-checkout):
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase secrets set WEBSITE_BASE_URL=https://fixorreplaceauto.com
// Deploy with:
//   supabase functions deploy create-donate-checkout

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const WEBSITE_BASE_URL = Deno.env.get('WEBSITE_BASE_URL') ?? 'https://fixorreplaceauto.com';

const MIN_AMOUNT_CENTS = 100; // $1
const MAX_AMOUNT_CENTS = 50000; // $500

interface DonateRequest {
  amountCents: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Server is not configured');
    }

    const { amountCents } = (await req.json()) as DonateRequest;
    if (
      typeof amountCents !== 'number' ||
      !Number.isInteger(amountCents) ||
      amountCents < MIN_AMOUNT_CENTS ||
      amountCents > MAX_AMOUNT_CENTS
    ) {
      return new Response(JSON.stringify({ error: 'Enter an amount between $1 and $500.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // session_id rides in the URL FRAGMENT, not a query string -- same
    // host-WAF reasoning as create-web-checkout.
    const successUrl = `${WEBSITE_BASE_URL}/donate-thank-you.html#session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${WEBSITE_BASE_URL}/donate.html`;

    const body = new URLSearchParams();
    body.set('mode', 'payment');
    body.set('success_url', successUrl);
    body.set('cancel_url', cancelUrl);
    body.set('line_items[0][quantity]', '1');
    body.set('line_items[0][price_data][currency]', 'usd');
    body.set('line_items[0][price_data][unit_amount]', String(amountCents));
    body.set('line_items[0][price_data][product_data][name]', 'Fix or Replace Auto -- Support the App');

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
      console.error('Stripe donate session creation failed:', stripeResponse.status, errorBody);
      throw new Error(`Stripe returned ${stripeResponse.status}`);
    }

    const session = (await stripeResponse.json()) as { url: string };

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('create-donate-checkout error:', error);
    return new Response(JSON.stringify({ error: 'Could not start checkout right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
