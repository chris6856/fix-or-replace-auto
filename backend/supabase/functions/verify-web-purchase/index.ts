// Verifies a Stripe Checkout Session server-side before the website reveals
// a paid-for recommendation -- the browser's own claim that a session ID
// came back from a successful redirect can't be trusted on its own; Stripe's
// API, called with the secret key, is the actual source of truth. Mirrors
// the app's verify-purchase function (same idea, different payment rail).
//
// Requires these secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase secrets set SUPABASE_URL=...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
// Deploy with:
//   supabase functions deploy verify-web-purchase

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const VALID_TIERS = ['decision', 'full'];

interface VerifyRequest {
  sessionId: string;
}

/** Confirms a Checkout Session was actually paid and returns its tier --
 *  shared shape used by both this function and send-web-report (Deno Edge
 *  Functions in this project don't share code across function boundaries,
 *  so this is intentionally duplicated there too; keep them in sync). */
async function verifyStripeSession(sessionId: string): Promise<{ tier: string } | null> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) return null;

  const session = (await response.json()) as {
    payment_status?: string;
    metadata?: { tier?: string };
  };

  const tier = session.metadata?.tier;
  if (session.payment_status !== 'paid' || !tier || !VALID_TIERS.includes(tier)) return null;

  return { tier };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Server is not configured');
    }

    const { sessionId } = (await req.json()) as VerifyRequest;
    if (!sessionId) {
      return new Response(JSON.stringify({ verified: false, error: 'sessionId is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await verifyStripeSession(sessionId);
    if (!result) {
      return new Response(JSON.stringify({ verified: false, error: 'Could not verify this payment.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort audit record -- Stripe remains the source of truth, so a
    // failure here shouldn't block revealing what the visitor already paid
    // for.
    await fetch(`${SUPABASE_URL}/rest/v1/web_purchases?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ stripe_session_id: sessionId, tier: result.tier }),
    }).catch((err) => console.error('web_purchases audit insert failed:', err));

    return new Response(JSON.stringify({ verified: true, tier: result.tier }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-web-purchase error:', error);
    return new Response(JSON.stringify({ verified: false, error: 'Could not verify this payment right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
