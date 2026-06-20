/** Negative if a is before b, zero if same day, positive if a is after b; null if invalid. */
export function compareTourDates(aYmd: string, bYmd: string): number | null {
  if (!aYmd || !bYmd) return null;
  const a = new Date(`${aYmd}T12:00:00`);
  const b = new Date(`${bYmd}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return a.getTime() - b.getTime();
}

export function isDepartureOnOrAfterArrival(arrivalYmd: string, departureYmd: string): boolean {
  const cmp = compareTourDates(arrivalYmd, departureYmd);
  return cmp === null || cmp <= 0;
}

/**
 * Inclusive tour day count: arrival day 1, departure on day N
 * (e.g. same calendar day = 1 day; three calendar days = 3 days).
 * Uses local noon to reduce DST edge cases.
 */
export function inclusiveTourDayCount(arrivalYmd: string, departureYmd: string): number {
  if (!arrivalYmd || !departureYmd) return 1;
  const a = new Date(`${arrivalYmd}T12:00:00`);
  const b = new Date(`${departureYmd}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

/** Departure date N calendar days after arrival (inclusive: 1 day = same day). */
export function departureDateFromArrival(arrivalYmd: string, numberOfDays: number): string | null {
  if (!arrivalYmd || !numberOfDays) return null;
  const arrival = new Date(`${arrivalYmd}T00:00:00`);
  if (Number.isNaN(arrival.getTime())) return null;

  const computedDeparture = new Date(arrival);
  computedDeparture.setDate(computedDeparture.getDate() + Math.max(0, numberOfDays - 1));
  return [
    computedDeparture.getFullYear(),
    String(computedDeparture.getMonth() + 1).padStart(2, '0'),
    String(computedDeparture.getDate()).padStart(2, '0'),
  ].join('-');
}
