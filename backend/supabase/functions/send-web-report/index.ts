// Emails a PDF report for the website's guest "Already Have an Estimate"
// flow -- the $1.99 tier's defining feature. There's no Supabase Auth
// account and no saved decision row here (see app/backend email-report for
// that signed-in equivalent); the visitor's own already-computed numbers
// are passed straight in, and this function's only real job is to
// re-verify with Stripe that this session actually paid for the "full"
// tier before building and sending anything -- the client's claim to have
// paid can't be trusted on its own.
//
// Requires these secrets (STRIPE_SECRET_KEY shared with the other web-*
// functions; SENDGRID_API_KEY/REPORT_FROM_EMAIL shared with the app's
// email-report function):
//   supabase secrets set STRIPE_SECRET_KEY=sk_...
//   supabase secrets set SENDGRID_API_KEY=...
//   supabase secrets set REPORT_FROM_EMAIL=reports@fixorreplaceauto.com
// Deploy with:
//   supabase functions deploy send-web-report

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const REPORT_FROM_EMAIL = Deno.env.get('REPORT_FROM_EMAIL') ?? 'reports@fixorreplaceauto.com';

const RECOMMENDATION_LABEL: Record<string, string> = {
  fix: 'FIX IT',
  get_quote: 'GET ANOTHER QUOTE',
  replace: 'REPLACE IT',
  too_close: 'TOO CLOSE TO CALL',
};

const RELIABILITY_LABEL: Record<string, string> = {
  reliable: 'Good',
  some_problems: 'Fair',
  problem_vehicle: 'Poor',
};

interface KeepInput {
  currentRepairCost: number;
  recentRepairsSum: number;
  ageYears: number;
  mileage: number;
  reliabilityBucket: string;
}

interface ReplaceInput {
  replacementPrice: number;
  salesTax: number;
  title: number;
  registration: number;
  docFee: number;
  delivery: number;
  otherFees: number;
  tradeOrSaleValue: number;
  financeMethod: 'cash' | 'finance';
  loanTermMonths: number;
}

interface CalcOutput {
  netReplacementAcquisitionCost: number;
  totalAcquisitionCostIncludingFinancing: number;
  monthlyPayment: number;
  totalInterest: number;
  repairThreshold: number;
  recommendation: string;
}

interface SendReportRequest {
  sessionId: string;
  email: string;
  vehicleLabel: string;
  repairDescription: string;
  input: { keep: KeepInput; replace: ReplaceInput };
  output: CalcOutput;
  explanation: string;
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

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MAX_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const TOP_Y = 740;
const BOTTOM_MARGIN = 60;
const MUTED: [number, number, number] = [0.4, 0.45, 0.48];
const INK: [number, number, number] = [0.08, 0.09, 0.1];

/** Mirrors backend/supabase/functions/email-report's ReportWriter -- Edge
 *  Functions in this project don't share code across function boundaries,
 *  so this is intentionally duplicated; keep them in sync. */
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

  labelValueRow(label: string, value: string, options: { bold?: boolean; size?: number } = {}) {
    const size = options.size ?? 12;
    this.ensureSpace(size + 8);
    const font = options.bold ? this.boldFont : this.font;
    this.page.drawText(label, { x: MARGIN_X, y: this.y, size, font, color: rgb(...INK) });
    const valueWidth = font.widthOfTextAtSize(value, size);
    this.page.drawText(value, { x: MARGIN_X + MAX_WIDTH - valueWidth, y: this.y, size, font, color: rgb(...INK) });
    this.y -= size + 9;
  }

  sectionHeader(label: string) {
    this.y -= 8;
    this.text(label, { size: 10, bold: true, color: MUTED, gap: 18 });
  }

  paragraph(value: string, options: { size?: number; gap?: number } = {}) {
    const size = options.size ?? 11;
    for (const line of wrapText(value, this.font, size, MAX_WIDTH)) {
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

async function buildReportPdf(req: SendReportRequest): Promise<Uint8Array> {
  const { input, output } = req;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new ReportWriter(doc, font, boldFont);

  w.text('Fix or Replace Auto', { size: 20, bold: true });
  w.text(`Decision Report -- ${new Date().toLocaleDateString()}`, { size: 11, color: MUTED, gap: 26 });

  w.sectionHeader('VEHICLE');
  w.text(req.vehicleLabel, { size: 13, bold: true });
  w.text(`${input.keep.mileage.toLocaleString()} miles`, { size: 10, color: MUTED });

  w.sectionHeader('THE REPAIR');
  w.paragraph(req.repairDescription || 'Repair', { size: 12, gap: 16 });
  w.text(`Estimated cost: ${formatCurrency(input.keep.currentRepairCost)}`);

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
  w.labelValueRow('Repair history/reliability', RELIABILITY_LABEL[input.keep.reliabilityBucket] ?? '--', {
    size: 11,
  });

  w.space(10);
  const recLabel = RECOMMENDATION_LABEL[output.recommendation] ?? String(output.recommendation);
  w.text(`RECOMMENDATION: ${recLabel}`, { size: 16, bold: true, gap: 26 });

  w.sectionHeader('WHY');
  w.paragraph(req.explanation, { size: 11, gap: 15 });

  w.space(14);
  w.paragraph(
    "This report provides estimates to help you think through a repair-versus-replace decision. It is not " +
      "mechanical, financial, or tax advice, and does not replace a qualified mechanic's inspection.",
    { size: 8, color: MUTED, gap: 11 },
  );
  w.text('fixorreplaceauto.com', { size: 9, color: MUTED });

  return w.save();
}

/** Mirrors verify-web-purchase's helper -- see that function's comment for
 *  why this is duplicated rather than shared. */
async function verifyPaidFullTier(sessionId: string): Promise<boolean> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) return false;
  const session = (await response.json()) as { payment_status?: string; metadata?: { tier?: string } };
  return session.payment_status === 'paid' && session.metadata?.tier === 'full';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY || !SENDGRID_API_KEY) {
      throw new Error('Server is not configured');
    }

    const payload = (await req.json()) as SendReportRequest;
    if (!payload.sessionId || !payload.email || !payload.input || !payload.output) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paidForFullReport = await verifyPaidFullTier(payload.sessionId);
    if (!paidForFullReport) {
      return new Response(JSON.stringify({ error: 'This session did not pay for the full report.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pdfBytes = await buildReportPdf(payload);
    const pdfBase64 = base64Encode(pdfBytes);

    const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.email }] }],
        from: { email: REPORT_FROM_EMAIL, name: 'Fix or Replace Auto' },
        subject: `Your Fix or Replace Auto Report -- ${payload.vehicleLabel}`,
        content: [
          {
            type: 'text/plain',
            value:
              `Attached is your fix-or-replace report for your ${payload.vehicleLabel}.\n\n` +
              "This report provides estimates to help you think through the decision -- it's not mechanical, " +
              "financial, or tax advice. Talk to a qualified mechanic before making a repair decision.\n\n" +
              '-- Fix or Replace Auto',
          },
        ],
        attachments: [
          {
            content: pdfBase64,
            filename: 'fix-or-replace-report.pdf',
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

    return new Response(JSON.stringify({ success: true, sentTo: payload.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-web-report error:', error);
    return new Response(JSON.stringify({ error: 'Could not email this report right now.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
