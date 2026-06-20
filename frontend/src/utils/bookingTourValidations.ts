import { isDepartureOnOrAfterArrival } from '@/utils/tourDates';

export type TourScheduleFields = {
  arrivalDate: string;
  departureDate: string;
  arrivalTime?: string;
  departureTime?: string;
};

export function validateDepartureOnOrAfterArrival(data: TourScheduleFields): boolean {
  if (!data.arrivalDate || !data.departureDate) return true;
  return isDepartureOnOrAfterArrival(data.arrivalDate, data.departureDate);
}

export function validateSameDayDepartureTime(data: TourScheduleFields): boolean {
  if (data.arrivalDate !== data.departureDate) return true;
  if (!data.arrivalTime || !data.departureTime) return true;
  return data.departureTime > data.arrivalTime;
}

export const departureDateOrderIssue = {
  message: 'Departure date must be on or after arrival date',
  path: ['departureDate'],
};

export const sameDayDepartureTimeIssue = {
  message: 'Departure time must be after arrival time on the same day',
  path: ['departureTime'],
};
