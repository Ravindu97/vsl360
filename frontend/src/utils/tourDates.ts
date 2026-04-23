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
