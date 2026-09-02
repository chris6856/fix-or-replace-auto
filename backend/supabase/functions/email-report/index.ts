// Emails a polished PDF of a saved decision to the signed-in user --
// the first paid-feature candidate discussed for this app. Builds the
// PDF itself with pdf-lib (pure JS, no headless browser needed -- not
// feasible in the Edge Function sandbox) and sends it via SendGrid.
//
// Deliberately re-fetches the decision using the CALLER's own JWT (never
// the service role) so Postgres RLS -- not this function -- is what
// guarantees a user can only ever email their own decisions.
//
// Requires these secrets:
//   supabase secrets set SENDGRID_API_KEY=...
//   supabase secrets set REPORT_FROM_EMAIL=reports@fixorreplaceauto.com
// (REPORT_FROM_EMAIL must be a verified sender/domain in SendGrid, or
// sends will fail.)
// Deploy with:
//   supabase functions deploy email-report

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const REPORT_FROM_EMAIL = Deno.env.get('REPORT_FROM_EMAIL') ?? 'reports@fixorreplaceauto.com';

const RECOMMENDATION_LABEL: Record<string, string> = {
  fix: 'FIX IT',
  get_quote: 'GET ANOTHER QUOTE',
  replace: 'REPLACE IT',
  too_close: 'TOO CLOSE TO CALL',
};

interface EmailReportRequest {
  decisionId: string;
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildReportPdf(decision: any): Promise<Uint8Array> {
  const vehicle = decision.vehicles;
  const repairEvent = decision.repair_events;
  const output = decision.calc_output;
  const input = decision.calc_input;

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 56;
  const maxWidth = 500;
  let y = 740;

  function drawText(
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) {
    const size = options.size ?? 11;
    const useFont = options.bold ? boldFont : font;
    const [r, g, b] = options.color ?? [0.08, 0.09, 0.1];
    page.drawText(text, { x: marginX, y, size, font: useFont, color: rgb(r, g, b) });
    y -= options.gap ?? size + 7;
  }

  drawText('Fix or Replace Auto', { size: 20, bold: true });
  drawText(`Decision Report -- ${new Date(decision.created_at).toLocaleDateString()}`, {
    size: 11,
    color: [0.4, 0.45, 0.48],
    gap: 30,
  });

  drawText('VEHICLE', { size: 10, bold: true, color: [0.4, 0.45, 0.48] });
  drawText(`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''}`, {
    size: 13,
    bold: true,
  });
  if (vehicle.vin) drawText(`VIN: ${vehicle.vin}`, { size: 10, color: [0.4, 0.45, 0.48] });
  drawText(`${Number(vehicle.current_mileage).toLocaleString()} miles`, {
    size: 10,
    color: [0.4, 0.45, 0.48],
    gap: 28,
  });

  drawText('THE REPAIR', { size: 10, bold: true, color: [0.4, 0.45, 0.48] });
  for (const line of wrapText(repairEvent?.description ?? repairEvent?.category ?? 'Repair', font, 12, maxWidth)) {
    drawText(line, { size: 12 });
  }
  drawText(`Estimated cost: ${formatCurrency(repairEvent?.cost ?? input.keep.currentRepairCost)}`, { gap: 28 });

  drawText('THE NUMBERS', { size: 10, bold: true, color: [0.4, 0.45, 0.48] });
  drawText(`Repair cost: ${formatCurrency(input.keep.currentRepairCost)}`);
  drawText(`Net cost to replace instead: ${formatCurrency(output.netReplacementAcquisitionCost)}`);
  drawText(`Repair threshold: ${formatCurrency(output.repairThreshold)}`);
  drawText(`Your current equity: ${formatCurrency(output.currentEquity)}`, { gap: 32 });

  const recLabel = RECOMMENDATION_LABEL[output.recommendation] ?? String(output.recommendation);
  drawText(`RECOMMENDATION: ${recLabel}`, { size: 15, bold: true, gap: 30 });

  if (decision.ai_explanation) {
    drawText('WHY', { size: 10, bold: true, color: [0.4, 0.45, 0.48] });
    const explanationLines = wrapText(decision.ai_explanation, font, 11, maxWidth).slice(0, 10);
    for (const line of explanationLines) {
      drawText(line, { size: 11, gap: 15 });
    }
    y -= 14;
  }

  drawText(
    'This report provides estimates to help you think through a repair-versus-replace decision. It is not',
    { size: 8, color: [0.55, 0.6, 0.62], gap: 11 },
  );
  drawText(
    "mechanical, financial, or tax advice, and does not replace a qualified mechanic's inspection.",
    { size: 8, color: [0.55, 0.6, 0.62], gap: 14 },
  );
  drawText('fixorreplaceauto.com', { size: 9, color: [0.55, 0.6, 0.62] });

  return doc.save();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SENDGRID_API_KEY) {
      throw new Error('Server is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'You need to be signed in to email a report.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { decisionId } = (await req.json()) as EmailReportRequest;
    if (!decisionId) {
      return new Response(JSON.stringify({ error: 'decisionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
    });
    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Could not verify your session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = await userResponse.json();
    const recipientEmail = user.email as string | undefined;
    if (!recipientEmail) {
      throw new Error('No email address on this account');
    }

    // RLS (via the caller's own JWT below, not the service role) is what
    // actually enforces that this can only ever return the signed-in
    // user's own decision.
    const decisionUrl = new URL(`${SUPABASE_URL}/rest/v1/decisions`);
    decisionUrl.searchParams.set('id', `eq.${decisionId}`);
    decisionUrl.searchParams.set(
      'select',
      'id,recommendation,calc_input,calc_output,ai_explanation,created_at,' +
        'repair_events(description,category,cost,is_safety_issue),' +
        'vehicles(year,make,model,trim,vin,current_mileage)',
    );

    const decisionResponse = await fetch(decisionUrl.toString(), {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
    });
    if (!decisionResponse.ok) {
      throw new Error(`Could not load decision (${decisionResponse.status})`);
    }
    const rows = (await decisionResponse.json()) as any[];
    const decision = rows[0];
    if (!decision) {
      return new Response(JSON.stringify({ error: 'Decision not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfBytes = await buildReportPdf(decision);
    const pdfBase64 = base64Encode(pdfBytes);

    const vehicle = decision.vehicles;
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipientEmail }] }],
        from: { email: REPORT_FROM_EMAIL, name: 'Fix or Replace Auto' },
        subject: `Your Fix or Replace Auto Report -- ${vehicleLabel}`,
        content: [
          {
            type: 'text/plain',
            value:
              `Attached is your fix-or-replace report for your ${vehicleLabel}.\n\n` +
              "This report provides estimates to help you think through the decision -- it's not mechanical, " +
              "financial, or tax advice. Talk to a qualified mechanic before making a repair decision.\n\n" +
              '-- Fix or Replace Auto',
          },
        ],
        attachments: [
          {
            content: pdfBase64,
            filename: `fix-or-replace-report-${decisionId}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      }),
    });

    if (!sendResponse.ok) {
      const body = await sendResponse.text();
      console.error('SendGrid error:', sendResponse.status, body);
      throw new Error(`SendGrid returned ${sendResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true, sentTo: recipientEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('email-report error:', error);
    return new Response(JSON.stringify({ error: 'Could not email this report right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
