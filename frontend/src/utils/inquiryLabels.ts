import type { CustomItineraryInquiry } from '@/types';

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

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-green-100 text-green-800',
};

export function travelStyleLabel(value: string): string {
  return TRAVEL_STYLE_LABELS[value] ?? value;
}

export function accommodationLabel(value: string): string {
  return ACCOMMODATION_LABELS[value] ?? value;
}

export function formatGuests(inquiry: Pick<CustomItineraryInquiry, 'adults' | 'children'>): string {
  const parts: string[] = [];
  parts.push(`${inquiry.adults} adult${inquiry.adults !== 1 ? 's' : ''}`);
  if (inquiry.children > 0) {
    parts.push(`${inquiry.children} child${inquiry.children !== 1 ? 'ren' : ''}`);
  }
  return parts.join(', ');
}

export function formatTripSummary(
  inquiry: Pick<CustomItineraryInquiry, 'arrivalDate' | 'departureDate' | 'durationDays'>,
): string {
  if (inquiry.arrivalDate && inquiry.departureDate) {
    return `${inquiry.arrivalDate} → ${inquiry.departureDate}`;
  }
  if (inquiry.durationDays) {
    return `${inquiry.durationDays} days (flexible dates)`;
  }
  return '—';
}

export function totalGuests(inquiry: Pick<CustomItineraryInquiry, 'adults' | 'children'>): number {
  return inquiry.adults + inquiry.children;
}

export function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function whatsappFollowUpUrl(name: string, phone: string): string {
  const message = `Hi ${name}, thank you for your custom Sri Lanka itinerary request with VSL 360. I'm your travel planner and would love to discuss your trip.`;
  return `https://wa.me/${digitsOnlyPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function emailFollowUpUrl(name: string, email: string): string {
  const subject = 'Your VSL 360 Custom Itinerary';
  const body = `Hi ${name},\n\nThank you for your custom Sri Lanka itinerary request with VSL 360. I'm your travel planner and would love to discuss your trip.\n\nBest regards`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
