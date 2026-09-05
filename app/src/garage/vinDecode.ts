interface NhtsaResult {
  Variable: string;
  Value: string | null;
}

interface NhtsaResponse {
  Results: NhtsaResult[];
}

export interface DecodedVehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  body: string | null;
}

export class VinDecodeError extends Error {}

// VINs are exactly 17 characters and never contain I, O, or Q (to avoid
// confusion with 1 and 0). Shared by both the barcode scanner (door jamb
// sticker) and OCR (windshield plate) capture paths.
const VIN_PATTERN = /[A-HJ-NPR-Z0-9]{17}/g;

/** Finds the first plausible 17-character VIN token in a block of raw text. */
export function extractVinCandidate(rawText: string): string | null {
  const matches = rawText.toUpperCase().match(VIN_PATTERN);
  return matches?.[0] ?? null;
}

/** Whole-string check for manual entry -- rejects I/O/Q before ever calling
 *  NHTSA, instead of surfacing a confusing decode error for them. */
export function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin.toUpperCase());
}

/**
 * Decodes a VIN via NHTSA's free, public vPIC API. Called directly from the
 * app rather than through a backend proxy -- there's no CORS restriction on
 * native HTTP clients, and no auth/caching need strong enough yet to justify
 * standing up and deploying a Supabase Edge Function for it (see build plan
 * section 4, "vin-decode-proxy" -- revisit if we want server-side caching).
 */
export async function decodeVin(vin: string): Promise<DecodedVehicle> {
  const normalizedVin = vin.trim().toUpperCase();
  if (normalizedVin.length !== 17) {
    throw new VinDecodeError('A VIN must be 17 characters.');
  }

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(normalizedVin)}?format=json`,
  );
  if (!response.ok) {
    throw new VinDecodeError('Could not reach the VIN decoding service. Try again shortly.');
  }

  const body = (await response.json()) as NhtsaResponse;
  const byVariable = new Map(body.Results.map((r) => [r.Variable, valueOrNull(r.Value)]));

  // NHTSA's "Error Code" is often a non-fatal warning (most commonly "1":
  // the check digit doesn't calculate properly) even for real, correctly
  // decoded VINs -- this hits hand-typed VINs disproportionately, since a
  // single transposed digit can trip the check-digit math without actually
  // being wrong. Whether the decode is usable is decided below by whether
  // year/make/model actually came back, not by this warning code.
  const year = parseInt(byVariable.get('Model Year') ?? '', 10);
  const make = titleCase(byVariable.get('Make'));
  const model = byVariable.get('Model');

  if (!year || !make || !model) {
    throw new VinDecodeError('This VIN decoded, but is missing year/make/model. Try entering the vehicle manually.');
  }

  return {
    vin: normalizedVin,
    year,
    make,
    model,
    trim: byVariable.get('Trim') ?? null,
    engine: describeEngine(byVariable),
    drivetrain: byVariable.get('Drive Type') ?? null,
    body: byVariable.get('Body Class') ?? null,
  };
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

function describeEngine(byVariable: Map<string, string | null | undefined>): string | null {
  const displacement = byVariable.get('Displacement (L)');
  const cylinders = byVariable.get('Engine Number of Cylinders');
  const configuration = byVariable.get('Engine Configuration');

  const parts: string[] = [];
  if (displacement) parts.push(`${Number(displacement).toFixed(1)}L`);
  if (configuration && cylinders) parts.push(`${configuration.replace('-Shaped', '')}${cylinders}`);
  else if (cylinders) parts.push(`${cylinders}-cyl`);

  return parts.length > 0 ? parts.join(' ') : null;
}
