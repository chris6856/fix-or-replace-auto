// Powers the website's Contact Us form (website/contact.html) -- sends the
// visitor's message to the team's inbox via SendGrid, with reply-to set to
// the visitor's own address so replying in a normal mail client goes
// straight back to them. No Supabase Auth or database involved; this is a
// public, anonymous endpoint.
//
// Requires these secrets (shared with the other email-sending functions):
//   supabase secrets set SENDGRID_API_KEY=...
//   supabase secrets set REPORT_FROM_EMAIL=reports@fixorreplaceauto.com
//   supabase secrets set CONTACT_TO_EMAIL=info@fixorreplaceauto.com
// Deploy with:
//   supabase functions deploy send-contact-message

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const REPORT_FROM_EMAIL = Deno.env.get('REPORT_FROM_EMAIL') ?? 'reports@fixorreplaceauto.com';
const CONTACT_TO_EMAIL = Deno.env.get('CONTACT_TO_EMAIL') ?? 'info@fixorreplaceauto.com';

interface ContactRequest {
  name: string;
  email: string;
  topic: string;
  message: string;
  // Honeypot -- a real visitor never fills this in (it's hidden via CSS);
  // a value here means a bot filled every field it could find.
  companyWebsite?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('Server is not configured');
    }

    const payload = (await req.json()) as ContactRequest;

    if (payload.companyWebsite) {
      // Honeypot tripped -- pretend success so a bot doesn't learn to
      // adjust, but never actually send anything.
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const name = (payload.name || '').trim();
    const email = (payload.email || '').trim();
    const topic = (payload.topic || 'General question').trim();
    const message = (payload.message || '').trim();

    if (!name || !email || !message || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Please fill in your name, a valid email, and a message.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: CONTACT_TO_EMAIL }] }],
        from: { email: REPORT_FROM_EMAIL, name: 'Fix or Replace Auto Website' },
        reply_to: { email, name },
        subject: `[Contact] ${topic} -- ${name}`,
        content: [
          {
            type: 'text/plain',
            value: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
          },
          {
            type: 'text/html',
            value: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
          },
        ],
      }),
    });

    if (!sendResponse.ok) {
      const body = await sendResponse.text();
      console.error('SendGrid error:', sendResponse.status, body);
      throw new Error(`SendGrid returned ${sendResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-contact-message error:', error);
    return new Response(JSON.stringify({ error: 'Could not send your message right now. Please try again shortly.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
