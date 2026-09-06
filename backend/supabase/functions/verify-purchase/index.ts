// Verifies a purchase server-side before granting the paywall entitlement
// it paid for -- the app's own claim of "the user paid" can never be
// trusted on its own. Branches on which store the app reports the
// purchase came from (react-native-iap's own purchase.store field):
// Google Play purchases are verified against the Android Publisher API,
// Apple purchases against the App Store Server API. Records the verified
// purchase (see purchases table -- its UNIQUE constraint on
// purchase_token is what stops the same token being replayed to unlock
// more than one decision; for Apple this column holds the transaction ID
// instead of a "token", but it serves the identical anti-replay purpose).
//
// Requires these secrets:
//   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<the full downloaded JSON key>'
//   supabase secrets set ANDROID_PACKAGE_NAME=com.fixorreplaceauto.app
//   supabase secrets set APPLE_ISSUER_ID=...
//   supabase secrets set APPLE_KEY_ID=...
//   supabase secrets set APPLE_PRIVATE_KEY='<the full downloaded .p8 key>'
//   supabase secrets set APPLE_BUNDLE_ID=com.fixorreplaceauto.app
// The Google service account must be granted access to this app in Play
// Console (Users and permissions) with "View financial data" and
// "Manage orders and subscriptions" permissions, and the Google Play
// Android Developer API must be enabled on its GCP project. The Apple key
// is generated in App Store Connect under Users and Access ->
// Integrations -> In-App Purchase (a different key type than the one
// used for Codemagic's App Store Connect API access).
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
const APPLE_ISSUER_ID = Deno.env.get('APPLE_ISSUER_ID');
const APPLE_KEY_ID = Deno.env.get('APPLE_KEY_ID');
const APPLE_PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY');
const APPLE_BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.fixorreplaceauto.app';

const VALID_PRODUCT_IDS = ['unlock_decision', 'unlock_full_report'];

interface VerifyPurchaseRequest {
  productId: string;
  purchaseToken: string;
  store?: string;
  transactionId?: string | null;
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

function base64UrlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return atob(padded);
}

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN (PRIVATE KEY|EC PRIVATE KEY)-----/, '')
    .replace(/-----END (PRIVATE KEY|EC PRIVATE KEY)-----/, '')
    .replace(/\s/g, '');
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

async function verifyGooglePurchase(
  productId: string,
  purchaseToken: string,
): Promise<{ verified: boolean; error?: string }> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
    return { verified: false, error: 'Server is not configured for Google Play verification.' };
  }

  const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccountKey;
  const accessToken = await getGoogleAccessToken(serviceAccount);

  const googleUrl =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  const googleResponse = await fetch(googleUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!googleResponse.ok) {
    const body = await googleResponse.text();
    console.error('Google Play verification failed:', googleResponse.status, body);
    return { verified: false, error: 'Could not verify this purchase with Google Play.' };
  }

  const purchaseData = (await googleResponse.json()) as { purchaseState?: number };
  // purchaseState: 0 = purchased, 1 = canceled, 2 = pending.
  if (purchaseData.purchaseState !== 0) {
    return { verified: false, error: 'This purchase was not completed.' };
  }

  return { verified: true };
}

/**
 * Signs the ES256 JWT Apple's App Store Server API requires on every
 * call -- unlike Google's OAuth flow, this is used directly as the
 * bearer token with no separate token-exchange step.
 */
async function getAppleJwt(): Promise<string> {
  if (!APPLE_ISSUER_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error('Apple verification is not configured');
  }

  const header = { alg: 'ES256', kid: APPLE_KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: APPLE_ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
    bid: APPLE_BUNDLE_ID,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64UrlEncode(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(APPLE_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  // Web Crypto's ECDSA sign() already returns the raw (r || s) signature
  // format JWS/ES256 expects -- no DER conversion needed, unlike most
  // other ECDSA tooling (e.g. OpenSSL/X.509) which defaults to DER.
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(signingInput));

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Decodes (without verifying) the payload of a JWS -- safe here because
 *  this JWS is Apple's own response to an authenticated HTTPS call we
 *  just made to Apple's server, not an untrusted value handed to us by
 *  the client. */
function decodeJwsPayload<T>(jws: string): T {
  const parts = jws.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWS from Apple');
  return JSON.parse(base64UrlDecode(parts[1])) as T;
}

interface AppleTransactionInfo {
  transactionId: string;
  productId: string;
  bundleId: string;
  environment?: string;
  revocationDate?: number;
}

async function fetchAppleTransaction(transactionId: string, jwt: string, baseUrl: string) {
  return fetch(`${baseUrl}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

async function verifyApplePurchase(
  productId: string,
  transactionId: string | null | undefined,
): Promise<{ verified: boolean; error?: string }> {
  if (!transactionId) {
    return { verified: false, error: 'No transaction id was returned for this purchase.' };
  }

  const jwt = await getAppleJwt();

  // Try production first, then fall back to the sandbox environment --
  // TestFlight and sandbox-tester purchases only exist in sandbox, and
  // Apple's own guidance is to attempt production first and retry against
  // sandbox on a not-found response rather than trying to guess up front.
  let response = await fetchAppleTransaction(transactionId, jwt, 'https://api.storekit.itunes.apple.com');
  if (response.status === 404) {
    response = await fetchAppleTransaction(transactionId, jwt, 'https://api.storekit-sandbox.itunes.apple.com');
  }

  if (!response.ok) {
    const body = await response.text();
    console.error('Apple verification failed:', response.status, body);
    return { verified: false, error: 'Could not verify this purchase with the App Store.' };
  }

  const { signedTransactionInfo } = (await response.json()) as { signedTransactionInfo: string };
  const transaction = decodeJwsPayload<AppleTransactionInfo>(signedTransactionInfo);

  if (transaction.bundleId !== APPLE_BUNDLE_ID || transaction.productId !== productId) {
    return { verified: false, error: 'This purchase does not match the requested product.' };
  }
  if (transaction.revocationDate) {
    return { verified: false, error: 'This purchase was refunded.' };
  }

  return { verified: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Server is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ verified: false, error: 'You need to be signed in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productId, purchaseToken, store, transactionId } = (await req.json()) as VerifyPurchaseRequest;
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

    const result =
      store === 'apple'
        ? await verifyApplePurchase(productId, transactionId)
        : await verifyGooglePurchase(productId, purchaseToken);

    if (!result.verified) {
      return new Response(JSON.stringify({ verified: false, error: result.error ?? 'Could not verify this purchase.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RLS (via the caller's own JWT below, not the service role) scopes
    // this insert to the signed-in user. The purchases table's UNIQUE
    // constraint on purchase_token rejects replaying the same token
    // twice, which is what actually stops one payment unlocking more
    // than one decision. For Apple purchases, purchaseToken is the JWS --
    // still unique per transaction, so it still serves that purpose.
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
