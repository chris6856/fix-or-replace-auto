import type { KeepInput } from '@fixorreplace/types';
import {
  AGE_OR_MILEAGE_DISCOUNT,
  CONDITION_ADJUSTMENT,
  HIGH_AGE_YEARS,
  HIGH_MILEAGE,
  RECENT_REPAIR_DRAG,
  REPLACEMENT_CAP_FRACTION_BY_RELIABILITY,
  VALUE_MULTIPLIER_BY_RELIABILITY,
} from './constants';

/**
 * The most a repair "deserves" to cost before replacement becomes the more
 * sensible option. Blended from the vehicle's own value, condition, age,
 * mileage, and repair history (never a single fixed ratio like
 * "50% of value"), and capped by what replacing would truly cost.
 */
export function computeRepairThreshold(keep: KeepInput, totalReplacementReferenceCost: number): number {
  const ageOrMileageFactor =
    keep.ageYears > HIGH_AGE_YEARS || keep.mileage > HIGH_MILEAGE ? AGE_OR_MILEAGE_DISCOUNT : 1;

  const valueBasedCap =
    keep.currentVehicleValue *
      VALUE_MULTIPLIER_BY_RELIABILITY[keep.reliabilityBucket] *
      CONDITION_ADJUSTMENT[keep.condition] *
      ageOrMileageFactor -
    keep.recentRepairsSum * RECENT_REPAIR_DRAG;

  const replacementBasedCap =
    totalReplacementReferenceCost * REPLACEMENT_CAP_FRACTION_BY_RELIABILITY[keep.reliabilityBucket];

  return Math.max(0, Math.min(valueBasedCap, replacementBasedCap));
}
