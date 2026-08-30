// Real vehicle valuation vendor integration (build plan milestone 10),
// replacing Screen 14's fully-manual entry. Proxied through an Edge
// Function because MarketCheck's API key is a paid credential that can't
// ship in the mobile app, same reasoning as ANTHROPIC_API_KEY.
//
// MarketCheck Price (base tier): GET /v2/predict/car/us/marketcheck_price
// Docs: https://docs.marketcheck.com/docs/api/cars/market-insights/marketcheck-price
// Requires: api_key, vin, miles, dealer_type, and zip (or city+state).
// Response: { marketcheck_price: number, msrp: number } -- a point
// estimate only, no range, so the +/- band and trade-value discount below
// are our own approximation, same as the manual-entry screen's band.
//
// Requires the MARKETCHECK_API_KEY secret:
//   supabase secrets set MARKETCHECK_API_KEY=...
// Deploy with:
//   supabase functions deploy valuation-proxy

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MARKETCHECK_API_KEY = Deno.env.get('MARKETCHECK_API_KEY');

interface ValuationRequest {
  vin: string | null;
  mileage: number;
  zip: string;
}

interface MarketCheckPriceResponse {
  marketcheck_price: number;
  msrp?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!MARKETCHECK_API_KEY) {
      throw new Error('MARKETCHECK_API_KEY is not configured');
    }

    const { vin, mileage, zip } = (await req.json()) as ValuationRequest;
    if (!vin) {
      // MarketCheck's price prediction requires a VIN -- vehicles added
      // manually without one can't be valued this way. The app falls back
      // to manual entry either way, so this is a normal, expected case.
      return new Response(JSON.stringify({ error: 'A VIN is required to fetch a market value.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL('https://api.marketcheck.com/v2/predict/car/us/marketcheck_price');
    url.searchParams.set('api_key', MARKETCHECK_API_KEY);
    url.searchParams.set('vin', vin);
    url.searchParams.set('miles', String(mileage));
    url.searchParams.set('zip', zip);
    url.searchParams.set('dealer_type', 'independent');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`MarketCheck returned ${response.status}`);
    }

    const body = (await response.json()) as MarketCheckPriceResponse;
    const workingValue = body.marketcheck_price;
    if (!workingValue) {
      throw new Error('MarketCheck did not return a price prediction for this vehicle');
    }

    // MarketCheck's base tier gives a single point estimate, not a range or
    // a separate trade-in figure -- approximate both the way the manual
    // entry screen already does, so behavior is consistent either way.
    const valueLow = Math.round(workingValue * 0.85);
    const valueHigh = Math.round(workingValue * 1.15);
    const tradeValue = Math.round(workingValue * 0.85);

    return new Response(
      JSON.stringify({
        valueLow,
        valueHigh,
        workingValue: Math.round(workingValue),
        tradeValue,
        source: 'marketcheck',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('valuation-proxy error:', error);
    return new Response(JSON.stringify({ error: 'Could not fetch a market value for this vehicle.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
