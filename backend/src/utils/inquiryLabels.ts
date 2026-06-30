export const TRAVEL_STYLE_LABELS: Record<string, string> = {
  wildlife: 'Wildlife & Safari',
  cultural: 'Cultural & Heritage',
  beaches: 'Pristine Beaches',
  'hill-country': 'Hill Country Adventure',
  wellness: 'Wellness & Ayurveda',
  luxury: 'Luxury Escape',
};

export const ACCOMMODATION_LABELS: Record<string, string> = {
  budget: 'Budget Homestays',
  '3-star': '3-Star Comfort',
  '4-star': '4-Star Premium',
  '5-star': '5-Star Luxury Resorts',
  eco: 'Eco-Lodges',
};

export function travelStyleLabel(value: string): string {
  return TRAVEL_STYLE_LABELS[value] ?? value;
}

export function accommodationLabel(value: string): string {
  return ACCOMMODATION_LABELS[value] ?? value;
}

export function formatGuestSummary(adults: number, children: number): string {
  const parts: string[] = [`${adults} adult${adults !== 1 ? 's' : ''}`];
  parts.push(`${children} child${children !== 1 ? 'ren' : ''}`);
  return parts.join(', ');
}

export function formatDurationSummary(
  arrivalDate: string | null,
  departureDate: string | null,
  durationDays: number | null,
): string {
  if (arrivalDate && departureDate) {
    return `${arrivalDate} → ${departureDate}`;
  }
  if (durationDays) {
    return `${durationDays} days`;
  }
  return '—';
}

/** Customer-facing timeline labels keyed by stage */
export const TIMELINE_STAGE_LABELS: Record<string, string> = {
  RECEIVED: 'Request received',
  CONTACTED: 'Planner assigned',
  QUOTED: 'Quote prepared',
};

export function timelineLabelForStatus(status: 'NEW' | 'CONTACTED' | 'QUOTED'): string | null {
  if (status === 'CONTACTED') return TIMELINE_STAGE_LABELS.CONTACTED;
  if (status === 'QUOTED') return TIMELINE_STAGE_LABELS.QUOTED;
  return null;
}
