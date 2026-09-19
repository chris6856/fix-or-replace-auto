// Lets a user permanently delete their own account, either from inside the
// app (Apple requires a discoverable in-app path) or from a plain web page
// with no app session (Google Play requires a path reachable outside the
// app too).
//
// Two ways in:
//  - App call: no email/password in the body, so the caller's own session
//    access token (already sitting in the Authorization header via
//    supabase-js) is resolved to a user id via /auth/v1/user. Works for
//    every sign-in method, including Apple/Google, which never have a
//    password to re-enter.
//  - Bare web page (delete-account.html): has no app session, so it
//    re-authenticates with the same email/password used to sign into the
//    app. Only works for password-based accounts -- Apple/Google users are
//    directed to the in-app option instead.
//
// vehicles.user_id references auth.users(id) on delete cascade, so
// deleting the auth user also removes their vehicles, repair_events,
// decisions, and valuation_cache rows -- no separate table-by-table
// cleanup needed.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// reserved names Supabase injects automatically into every Edge
// Function -- nothing to configure.
//
// Deploy with:
//   supabase functions deploy delete-account

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface DeleteAccountRequest {
  email?: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment is not configured');
    }

    const body = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as DeleteAccountRequest) : {};
    const { email, password } = body;

    let userId: string | undefined;

    if (email && password) {
      // Bare web page path: no app session, so re-authenticate with
      // email/password. Only works for accounts that have a password.
      const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!signInResponse.ok) {
        return new Response(JSON.stringify({ error: 'Incorrect email or password.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const session = (await signInResponse.json()) as { user?: { id?: string } };
      userId = session.user?.id;
    } else {
      // In-app path: supabase-js sends the caller's own session access
      // token as the Authorization header, so resolve the user from that
      // instead of asking for credentials again.
      const authHeader = req.headers.get('Authorization');
      const userResponse = authHeader
        ? await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
          })
        : null;

      if (!userResponse || !userResponse.ok) {
        return new Response(JSON.stringify({ error: 'Your session has expired. Please sign in again.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const user = (await userResponse.json()) as { id?: string };
      userId = user.id;
    }

    if (!userId) {
      throw new Error('Could not resolve the account to delete');
    }

    const deleteResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Auth admin delete returned ${deleteResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('delete-account error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong deleting your account. Please try again or contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
