import { PaxType } from '@/types';
import type { Booking } from '@/types';

/** Free (0×): age ≤5. Half (0.5×): ages 6–11. Full (1×): age ≥12. */
export type PolicyTier = 'infant' | 'child' | 'adult';

export function policyTierFromAge(age: number): PolicyTier {
  if (age <= 5) return 'infant';
  if (age <= 11) return 'child';
  return 'adult';
}

function policyTierFromPaxType(type: PaxType): PolicyTier {
  if (type === PaxType.INFANT) return 'infant';
  if (type === PaxType.CHILD) return 'child';
  return 'adult';
}

/** If `age` is set, use age bands; otherwise use stored `PaxType` (legacy rows). */
export function policyTierForPax(age: number | null | undefined, fallbackType: PaxType): PolicyTier {
  if (age !== null && age !== undefined && Number.isFinite(age)) {
    return policyTierFromAge(age);
  }
  return policyTierFromPaxType(fallbackType);
}

export function inferPaxTypeFromAge(age: number): PaxType {
  if (age <= 5) return PaxType.INFANT;
  if (age <= 11) return PaxType.CHILD;
  return PaxType.ADULT;
}

export function guestCountsByPolicy(booking: Booking) {
  let adults = booking.client ? 1 : 0;
  let children = 0;
  let infants = 0;
  for (const p of booking.paxList ?? []) {
    const tier = policyTierForPax(p.age, p.type);
    if (tier === 'adult') adults += 1;
    else if (tier === 'child') children += 1;
    else infants += 1;
  }
  return {
    adults,
    children,
    infants,
    totalGuests: adults + children + infants,
  };
}

export type PolicyBreakdown = {
  adults: number;
  children: number;
  infants: number;
  adultUnits: number;
  childUnits: number;
  totalUnits: number;
  adultRate: number;
  childRate: number;
  infantRate: number;
  adultSubtotal: number;
  childSubtotal: number;
  infantSubtotal: number;
  computedTotal: number;
};

export function computePolicyBreakdown(booking: Booking, costPerPerson: number): PolicyBreakdown {
  const { adults, children, infants } = guestCountsByPolicy(booking);

  const adultUnits = adults;
  const childUnits = children * 0.5;
  const totalUnits = adultUnits + childUnits;

  const adultRate = costPerPerson;
  const childRate = costPerPerson * 0.5;
  const infantRate = 0;

  const adultSubtotal = adults * adultRate;
  const childSubtotal = children * childRate;
  const infantSubtotal = infants * infantRate;
  const computedTotal = adultSubtotal + childSubtotal + infantSubtotal;

  return {
    adults,
    children,
    infants,
    adultUnits,
    childUnits,
    totalUnits,
    adultRate,
    childRate,
    infantRate,
    adultSubtotal,
    childSubtotal,
    infantSubtotal,
    computedTotal,
  };
}
