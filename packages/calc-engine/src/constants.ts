// Tunable knobs for the KEEP/REPLACE scoring model (build plan section 3).
// Every multiplier used by the banding logic lives here so the model's
// behavior can be retuned without touching the scoring math itself.

import type { ReliabilityBucket, VehicleCondition } from '@fixorreplace/types';

/**
 * How many multiples of current market value a vehicle "deserves" spent on
 * repair before replacement becomes the more sensible option, keyed by
 * reliability history. Further adjusted by condition and age/mileage below.
 * This is deliberately NOT a single fixed ratio (e.g. "50% of value") — it
 * varies with the vehicle's actual track record.
 */
export const VALUE_MULTIPLIER_BY_RELIABILITY: Record<ReliabilityBucket, number> = {
  reliable: 1.5,
  some_problems: 0.9,
  problem_vehicle: 0.6,
};

export const CONDITION_ADJUSTMENT: Record<VehicleCondition, number> = {
  excellent: 1.1,
  good: 1.0,
  fair: 0.85,
  poor: 0.65,
};

/** High age or mileage shortens remaining useful life, so it discounts the
 *  value-based repair budget even for an otherwise reliable vehicle. */
export const HIGH_AGE_YEARS = 12;
export const HIGH_MILEAGE = 150_000;
export const AGE_OR_MILEAGE_DISCOUNT = 0.9;

/** Recent repair spending eats into how much more repair budget we think is
 *  left — a vehicle that's already needed $X in repairs this year has less
 *  room left, not more. */
export const RECENT_REPAIR_DRAG = 0.5;

/**
 * The repair threshold can never exceed this fraction of the true total cost
 * of replacing (out-the-door price, less trade-in/payoff, plus financing
 * cost) — keyed by reliability, so an unreliable vehicle's repair budget
 * tops out well below full replacement cost even if its market value is
 * high.
 */
export const REPLACEMENT_CAP_FRACTION_BY_RELIABILITY: Record<ReliabilityBucket, number> = {
  reliable: 0.55,
  some_problems: 0.4,
  problem_vehicle: 0.25,
};

/** Recommendation bands, expressed as a ratio of currentRepairCost to repairThreshold. */
export const FIX_BAND_MAX_RATIO = 0.85;
export const REPLACE_BAND_MIN_RATIO = 1.5;

/**
 * If the repair cost and the true total cost of replacing are within this
 * fraction of each other in absolute dollars, neither option has a
 * meaningful financial edge — this overrides the ratio bands above.
 */
export const TOO_CLOSE_TO_CALL_FRACTION = 0.08;
