// Lets a signed-in user permanently delete their own account from a plain
// web page, not just from inside the app -- Google Play requires an
// account-deletion path reachable outside the app for any app that
// supports account creation.
//
// There's no app session to check on a bare web page, so this
// re-authenticates the requester with the same email/password they use to
// sign into the app before deleting anything.
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
  email: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment is not configured');
    }

    const { email, password } = (await req.json()) as DeleteAccountRequest;
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const userId = session.user?.id;
    if (!userId) {
      throw new Error('Sign-in succeeded but returned no user id');
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
