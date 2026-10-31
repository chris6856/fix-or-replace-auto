// Confirms a donation Checkout Session was actually paid and records a
// best-effort audit row -- Stripe remains the source of truth, so a
// failure here never blocks the thank-you page. Mirrors verify-web-purchase
// (same idea, no "tier" to unlock since there's nothing to reveal after a
// donation).
//
// Requires these secrets (shared with verify-web-purchase):
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase secrets set SUPABASE_URL=...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
// Deploy with:
//   supabase functions deploy verify-donation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface VerifyRequest {
  sessionId: string;
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

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ verified: false, error: 'Could not verify this payment.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = (await response.json()) as { payment_status?: string; amount_total?: number };
    if (session.payment_status !== 'paid' || !session.amount_total) {
      return new Response(JSON.stringify({ verified: false, error: 'Could not verify this payment.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort audit record -- Stripe remains the source of truth, so a
    // failure here shouldn't block showing the thank-you message.
    await fetch(`${SUPABASE_URL}/rest/v1/donations?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ stripe_session_id: sessionId, amount_cents: session.amount_total }),
    }).catch((err) => console.error('donations audit insert failed:', err));

    return new Response(JSON.stringify({ verified: true, amountCents: session.amount_total }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-donation error:', error);
    return new Response(JSON.stringify({ verified: false, error: 'Could not verify this payment right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
