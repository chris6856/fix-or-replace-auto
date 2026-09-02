// Verifies a Google Play purchase token server-side before granting the
// paywall entitlement it paid for -- the app's own claim of "the user
// paid" can never be trusted on its own; this Edge Function, calling
// Google's Android Publisher API directly, is the actual source of
// truth. Records the verified purchase (see purchases table -- its
// UNIQUE constraint on purchase_token is what stops the same token being
// replayed to unlock more than one decision).
//
// Requires these secrets:
//   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<the full downloaded JSON key>'
//   supabase secrets set ANDROID_PACKAGE_NAME=com.fixorreplaceauto.app
// The service account must be granted access to this app in Play
// Console (Users and permissions) with "View financial data" and
// "Manage orders and subscriptions" permissions, and the Google Play
// Android Developer API must be enabled on its GCP project.
// Deploy with:
//   supabase functions deploy verify-purchase

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
const ANDROID_PACKAGE_NAME = Deno.env.get('ANDROID_PACKAGE_NAME') ?? 'com.fixorreplaceauto.app';

const VALID_PRODUCT_IDS = ['unlock_decision', 'unlock_full_report'];

interface VerifyPurchaseRequest {
  productId: string;
  purchaseToken: string;
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(
    /\s/g,
    '',
  );
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Signs a Google service-account JWT and exchanges it for an OAuth
 * access token -- the standard "JWT bearer" flow for server-to-server
 * Google API auth, done here with only Web Crypto (no external JWT
 * library) to match this project's dependency-free Edge Function style.
 */
async function getGoogleAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Google token exchange failed (${tokenResponse.status}): ${body}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error('Server is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ verified: false, error: 'You need to be signed in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productId, purchaseToken } = (await req.json()) as VerifyPurchaseRequest;
    if (!productId || !purchaseToken || !VALID_PRODUCT_IDS.includes(productId)) {
      return new Response(JSON.stringify({ verified: false, error: 'Invalid purchase request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
    });
    if (!userResponse.ok) {
      return new Response(JSON.stringify({ verified: false, error: 'Could not verify your session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = await userResponse.json();
    const userId = user.id as string | undefined;
    if (!userId) throw new Error('No user id on this session');

    const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccountKey;
    const accessToken = await getGoogleAccessToken(serviceAccount);

    const googleUrl =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}` +
      `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

    const googleResponse = await fetch(googleUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleResponse.ok) {
      const body = await googleResponse.text();
      console.error('Google Play verification failed:', googleResponse.status, body);
      return new Response(JSON.stringify({ verified: false, error: 'Could not verify this purchase with Google Play.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const purchaseData = (await googleResponse.json()) as { purchaseState?: number };
    // purchaseState: 0 = purchased, 1 = canceled, 2 = pending.
    if (purchaseData.purchaseState !== 0) {
      return new Response(JSON.stringify({ verified: false, error: 'This purchase was not completed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RLS (via the caller's own JWT below, not the service role) scopes
    // this insert to the signed-in user. The purchases table's UNIQUE
    // constraint on purchase_token rejects replaying the same token
    // twice, which is what actually stops one payment unlocking more
    // than one decision.
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id: userId, product_id: productId, purchase_token: purchaseToken }),
    });

    if (!insertResponse.ok) {
      const body = await insertResponse.text();
      if (body.includes('duplicate key') || body.includes('purchases_purchase_token_key')) {
        return new Response(JSON.stringify({ verified: false, error: 'This purchase has already been used.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Could not record purchase (${insertResponse.status}): ${body}`);
    }

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-purchase error:', error);
    return new Response(JSON.stringify({ verified: false, error: 'Could not verify this purchase right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
