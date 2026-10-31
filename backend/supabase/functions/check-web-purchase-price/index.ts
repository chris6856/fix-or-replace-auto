// Purchase Check for anonymous website visitors -- "is this used car a fair
// price for the mileage." Mirrors valuation-proxy's MarketCheck call (see
// that function's comments for the vendor/endpoint details) plus the
// app's app/src/purchaseCheck/evaluatePurchase.ts verdict logic, both
// intentionally duplicated here rather than shared across the app/web
// boundary (same reasoning as verify-purchase/verify-web-purchase and
// email-report/send-web-report elsewhere in this project).
//
// No Supabase Auth involved -- this is a public page, gated instead by a
// Cloudflare Turnstile token (cheap/free, unlike the MarketCheck call this
// protects) verified server-side before any paid API call runs.
//
// Also does the NHTSA VIN decode server-side (app/src/garage/vinDecode.ts's
// decodeVin, duplicated here for the same reason) so the website flow is
// one form submission instead of two round-trips -- there's no owned
// vehicle record on the website to already have this data.
//
// Requires these secrets:
//   supabase secrets set MARKETCHECK_API_KEY=...   (shared with valuation-proxy)
//   supabase secrets set TURNSTILE_SECRET_KEY=...
// Deploy with:
//   supabase functions deploy check-web-purchase-price

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARKETCHECK_API_KEY = Deno.env.get('MARKETCHECK_API_KEY');
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY');

interface CheckRequest {
  vin: string;
  mileage: number;
  zip: string;
  askingPrice: number;
  turnstileToken: string;
}

interface MarketCheckPriceResponse {
  marketcheck_price: number;
  msrp?: number;
}

interface NhtsaResult {
  Variable: string;
  Value: string | null;
}

interface NhtsaResponse {
  Results: NhtsaResult[];
}

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

function valueOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function titleCase(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

async function decodeVin(vin: string): Promise<{ year: number; make: string; model: string; trim: string | null }> {
  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
  );
  if (!response.ok) {
    throw new Error('Could not reach the VIN decoding service.');
  }

  const body = (await response.json()) as NhtsaResponse;
  const byVariable = new Map(body.Results.map((r) => [r.Variable, valueOrNull(r.Value)]));

  const year = parseInt(byVariable.get('Model Year') ?? '', 10);
  const make = titleCase(byVariable.get('Make'));
  const model = byVariable.get('Model');

  if (!year || !make || !model) {
    throw new Error('This VIN decoded, but is missing year/make/model. Double-check it and try again.');
  }

  return { year, make, model, trim: byVariable.get('Trim') ?? null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!MARKETCHECK_API_KEY || !TURNSTILE_SECRET_KEY) {
      throw new Error('Server is not configured');
    }

    const { vin, mileage, zip, askingPrice, turnstileToken } = (await req.json()) as CheckRequest;

    if (!(await verifyTurnstile(turnstileToken))) {
      return new Response(JSON.stringify({ error: 'Verification failed. Please try again.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vin || vin.trim().length !== 17) {
      return new Response(JSON.stringify({ error: 'A valid 17-character VIN is required.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Number.isFinite(mileage) || mileage <= 0) {
      return new Response(JSON.stringify({ error: 'Enter the mileage.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
      return new Response(JSON.stringify({ error: 'Enter the asking price.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedVin = vin.trim().toUpperCase();
    let decoded: { year: number; make: string; model: string; trim: string | null };
    try {
      decoded = await decodeVin(normalizedVin);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Could not decode this VIN.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = new URL('https://api.marketcheck.com/v2/predict/car/us/marketcheck_price');
    url.searchParams.set('api_key', MARKETCHECK_API_KEY);
    url.searchParams.set('vin', normalizedVin);
    url.searchParams.set('miles', String(mileage));
    url.searchParams.set('zip', zip);
    url.searchParams.set('dealer_type', 'independent');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`MarketCheck returned ${response.status}`);
    }

    const body = (await response.json()) as MarketCheckPriceResponse;
    const marketValue = body.marketcheck_price;
    if (!marketValue) {
      throw new Error('MarketCheck did not return a price prediction for this vehicle');
    }

    const valueLow = Math.round(marketValue * 0.85);
    const valueHigh = Math.round(marketValue * 1.15);
    const verdict = askingPrice < valueLow ? 'below_market' : askingPrice > valueHigh ? 'above_market' : 'at_market';

    return new Response(
      JSON.stringify({
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        marketValue: Math.round(marketValue),
        valueLow,
        valueHigh,
        verdict,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('check-web-purchase-price error:', error);
    return new Response(JSON.stringify({ error: 'Could not check this price right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
