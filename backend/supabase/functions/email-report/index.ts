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

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';

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

const RELIABILITY_LABEL: Record<string, string> = {
  reliable: 'Good',
  some_problems: 'Fair',
  problem_vehicle: 'Poor',
};

const REPAIR_RISK_LABEL: Record<string, string> = {
  reliable: 'Lower',
  some_problems: 'Moderate',
  problem_vehicle: 'Elevated',
};

/**
 * Mirrors app/src/decision/mechanicQuestions.ts -- duplicated rather than
 * shared since Edge Functions (Deno) and the RN app don't share code
 * across that boundary in this project. Keep these two in sync if the
 * question wording ever changes.
 */
function buildMechanicQuestions(repairCategory: string, repairCost: number): string[] {
  const categoryLower = repairCategory.toLowerCase();
  return [
    `Is ${formatCurrency(repairCost)} the complete out-the-door repair price?`,
    `Which ${categoryLower} components are being replaced?`,
    'Which repairs are necessary now?',
    'Are any items recommendations rather than required repairs?',
    'What parts and labor warranty is included?',
    'Do you see any other major repairs likely soon?',
  ];
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MAX_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_Y = 740;
const BOTTOM_MARGIN = 60;
const MUTED: [number, number, number] = [0.4, 0.45, 0.48];
const INK: [number, number, number] = [0.08, 0.09, 0.1];

/** Small stateful writer so every section doesn't have to hand-manage
 *  pagination -- a full report (side-by-side, 24-month outlook, threshold,
 *  why, mechanic questions) routinely runs past one US Letter page. */
class ReportWriter {
  private page: PDFPage;
  private y = TOP_Y;

  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private boldFont: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < BOTTOM_MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = TOP_Y;
    }
  }

  text(
    value: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; x?: number } = {},
  ) {
    const size = options.size ?? 11;
    this.ensureSpace(size + 6);
    const useFont = options.bold ? this.boldFont : this.font;
    const [r, g, b] = options.color ?? INK;
    this.page.drawText(value, { x: options.x ?? MARGIN_X, y: this.y, size, font: useFont, color: rgb(r, g, b) });
    this.y -= options.gap ?? size + 7;
  }

  /** Right-aligned value on the same baseline as a left label -- used for
   *  the side-by-side table and outlook cards. */
  labelValueRow(label: string, value: string, options: { bold?: boolean; size?: number } = {}) {
    const size = options.size ?? 12;
    this.ensureSpace(size + 8);
    const font = options.bold ? this.boldFont : this.font;
    this.page.drawText(label, { x: MARGIN_X, y: this.y, size, font, color: rgb(...INK) });
    const valueWidth = font.widthOfTextAtSize(value, size);
    this.page.drawText(value, {
      x: MARGIN_X + MAX_WIDTH - valueWidth,
      y: this.y,
      size,
      font,
      color: rgb(...INK),
    });
    this.y -= size + 9;
  }

  sectionHeader(label: string) {
    this.y -= 8;
    this.text(label, { size: 10, bold: true, color: MUTED, gap: 18 });
  }

  paragraph(value: string, options: { size?: number; gap?: number; maxLines?: number } = {}) {
    const size = options.size ?? 11;
    const lines = wrapText(value, this.font, size, MAX_WIDTH);
    const capped = options.maxLines ? lines.slice(0, options.maxLines) : lines;
    for (const line of capped) {
      this.text(line, { size, gap: options.gap ?? size + 4 });
    }
  }

  hairline() {
    this.ensureSpace(14);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y + 4 },
      end: { x: MARGIN_X + MAX_WIDTH, y: this.y + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.88),
    });
    this.y -= 10;
  }

  space(amount: number) {
    this.y -= amount;
  }

  save() {
    return this.doc.save();
  }
}

async function buildReportPdf(decision: any): Promise<Uint8Array> {
  const vehicle = decision.vehicles;
  const repairEvent = decision.repair_events;
  const output = decision.calc_output;
  const input = decision.calc_input;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new ReportWriter(doc, font, boldFont);

  // -- Header --
  w.text('Fix or Replace Auto', { size: 20, bold: true });
  w.text(`Decision Report -- ${new Date(decision.created_at).toLocaleDateString()}`, {
    size: 11,
    color: MUTED,
    gap: 26,
  });

  // -- Vehicle --
  w.sectionHeader('VEHICLE');
  w.text(`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ' ' + vehicle.trim : ''}`, {
    size: 13,
    bold: true,
  });
  if (vehicle.vin) w.text(`VIN: ${vehicle.vin}`, { size: 10, color: MUTED });
  w.text(`${Number(vehicle.current_mileage).toLocaleString()} miles`, { size: 10, color: MUTED });

  // -- The repair --
  w.sectionHeader('THE REPAIR');
  w.paragraph(repairEvent?.description ?? repairEvent?.category ?? 'Repair', { size: 12, gap: 16 });
  w.text(`Estimated cost: ${formatCurrency(repairEvent?.cost ?? input.keep.currentRepairCost)}`);

  // -- Side-by-side (mirrors SideBySideScreen) --
  w.sectionHeader('YOUR TWO OPTIONS: FIX vs. REPLACE');
  const titleRegistration = input.replace.title + input.replace.registration;
  const dealerFees = input.replace.docFee + input.replace.delivery + input.replace.otherFees;
  const fixCost = input.keep.currentRepairCost;
  const replaceCost = output.totalAcquisitionCostIncludingFinancing;
  w.labelValueRow('Repair (fix)', formatCurrency(fixCost));
  w.labelValueRow('Replacement vehicle', formatCurrency(input.replace.replacementPrice));
  w.labelValueRow('Sales tax', formatCurrency(input.replace.salesTax));
  w.labelValueRow('Title/registration', formatCurrency(titleRegistration));
  w.labelValueRow('Dealer/delivery fees', formatCurrency(dealerFees));
  w.labelValueRow('Current vehicle credit', `-${formatCurrency(input.replace.tradeOrSaleValue)}`);
  w.labelValueRow('Financing interest', formatCurrency(output.totalInterest));
  w.hairline();
  w.labelValueRow('Fix: total estimated cost', formatCurrency(fixCost), { bold: true });
  w.labelValueRow('Replace: total estimated cost', formatCurrency(replaceCost), { bold: true });
  const diff = Math.abs(fixCost - replaceCost);
  const diffLabel = fixCost <= replaceCost ? 'Fixing preserves approximately' : 'Replacing saves approximately';
  w.space(4);
  w.text(`${diffLabel} ${formatCurrency(diff)}`, { size: 12, bold: true, gap: 18 });
  w.paragraph(
    "Repairing also carries greater future repair risk because of the vehicle's age and mileage -- this " +
      'report does not pretend a repair makes an older vehicle new.',
    { size: 9, color: MUTED, gap: 13 },
  );

  // -- Next 24 months (mirrors OutlookScreen) --
  w.sectionHeader('THE NEXT 24 MONTHS');
  w.text('Fix current vehicle', { size: 11, bold: true, gap: 16 });
  w.labelValueRow('Repair now', formatCurrency(input.keep.currentRepairCost), { size: 10 });
  w.labelValueRow('Recent repair history', formatCurrency(input.keep.recentRepairsSum), { size: 10 });
  w.labelValueRow('Vehicle', `${input.keep.ageYears} yrs / ${input.keep.mileage.toLocaleString()} mi`, { size: 10 });
  w.labelValueRow('Reliability', RELIABILITY_LABEL[input.keep.reliabilityBucket] ?? '--', { size: 10 });
  w.labelValueRow('Additional repair risk', REPAIR_RISK_LABEL[input.keep.reliabilityBucket] ?? '--', { size: 10 });
  w.space(10);
  w.text('Replace vehicle', { size: 11, bold: true, gap: 16 });
  w.labelValueRow('Initial net acquisition', formatCurrency(output.netReplacementAcquisitionCost), { size: 10 });
  const monthsFinanced = Math.min(24, input.replace.loanTermMonths);
  const paymentsOver24Months = input.replace.financeMethod === 'finance' ? output.monthlyPayment * monthsFinanced : 0;
  w.labelValueRow(
    'Monthly payment',
    input.replace.financeMethod === 'finance' ? `${formatCurrency(output.monthlyPayment)}/mo` : 'N/A (cash)',
    { size: 10 },
  );
  w.labelValueRow('Payments over 24 months', formatCurrency(paymentsOver24Months), { size: 10 });
  w.paragraph('Not included above: potential insurance changes, routine maintenance.', {
    size: 9,
    color: MUTED,
    gap: 13,
  });

  // -- Repair threshold (mirrors ThresholdScreen) --
  w.sectionHeader('YOUR REPAIR THRESHOLD');
  w.text(formatCurrency(output.repairThreshold), { size: 22, bold: true, gap: 26 });
  w.paragraph(
    "Based on the replacement option entered, this vehicle's condition, mileage, recent repair history, and " +
      'current value, repairing remains financially competitive up to approximately this amount.',
    { size: 10, color: MUTED, gap: 14 },
  );
  const margin = Math.abs(output.repairThreshold - fixCost);
  const isBelow = fixCost <= output.repairThreshold;
  w.labelValueRow('Your estimate', formatCurrency(fixCost), { size: 11 });
  w.labelValueRow(isBelow ? 'Below threshold by' : 'Above threshold by', formatCurrency(margin), { size: 11 });

  // -- Recommendation --
  w.space(10);
  const recLabel = RECOMMENDATION_LABEL[output.recommendation] ?? String(output.recommendation);
  w.text(`RECOMMENDATION: ${recLabel}`, { size: 16, bold: true, gap: 26 });

  // -- Why --
  if (decision.ai_explanation) {
    w.sectionHeader('WHY');
    w.paragraph(decision.ai_explanation, { size: 11, gap: 15 });
  }

  // -- Questions for the mechanic --
  w.sectionHeader('QUESTIONS TO ASK YOUR MECHANIC');
  const questions = buildMechanicQuestions(repairEvent?.category ?? 'General Repair', fixCost);
  questions.forEach((question, index) => {
    w.paragraph(`${index + 1}. ${question}`, { size: 11, gap: 15 });
  });

  // -- Disclaimer / footer --
  w.space(14);
  w.paragraph(
    "This report provides estimates to help you think through a repair-versus-replace decision. It is not " +
      "mechanical, financial, or tax advice, and does not replace a qualified mechanic's inspection.",
    { size: 8, color: MUTED, gap: 11 },
  );
  w.text('fixorreplaceauto.com', { size: 9, color: MUTED });

  return w.save();
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
