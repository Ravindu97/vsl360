import { z } from 'zod';

function isDepartureOnOrAfterArrival(arrivalDate: string, departureDate: string): boolean {
  const arrival = new Date(`${arrivalDate.slice(0, 10)}T12:00:00`);
  const departure = new Date(`${departureDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) return true;
  return departure.getTime() >= arrival.getTime();
}

function isSameDayDepartureTimeValid(data: {
  arrivalDate: string;
  departureDate: string;
  arrivalTime?: string;
  departureTime?: string;
}): boolean {
  const arrivalDay = data.arrivalDate.slice(0, 10);
  const departureDay = data.departureDate.slice(0, 10);
  if (arrivalDay !== departureDay) return true;
  if (!data.arrivalTime || !data.departureTime) return true;
  return data.departureTime > data.arrivalTime;
}

const tourScheduleRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (data: { arrivalDate: string; departureDate: string }) =>
        isDepartureOnOrAfterArrival(data.arrivalDate, data.departureDate),
      { message: 'Departure date must be on or after arrival date' }
    )
    .refine(isSameDayDepartureTimeValid, {
      message: 'Departure time must be after arrival time on the same day',
    });

export const createBookingSchema = tourScheduleRefinements(z.object({
  numberOfDays: z.number().int().positive(),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  arrivalTime: z.string().optional(),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  departureTime: z.string().optional(),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  includeActivities: z.boolean().default(true),
  includeTransport: z.boolean().default(true),
  includeHotel: z.boolean().default(true),
  flightNumber: z.string().optional(),
  client: z.object({
    name: z.string().min(1, 'Guest name is required'),
    citizenship: z.string().min(1, 'Citizenship is required'),
    languagePreference: z.string().min(1, 'Language preference is required').default('English'),
    preferredCurrency: z.enum(['EUR', 'USD', 'INR', 'LKR']).default('USD'),
    email: z.string().email('Invalid email'),
    contactNumber: z.string().min(1, 'Contact number is required'),
    passportNumber: z.string().optional(),
  }),
}).refine(
  (data) => data.includeActivities || data.includeTransport || data.includeHotel,
  { message: 'At least one scope option must be selected' }
));

export const updateBookingSchema = z.object({
  numberOfDays: z.number().int().positive().optional(),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  arrivalTime: z.string().min(1).optional(),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  departureTime: z.string().min(1).optional(),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  includeActivities: z.boolean().optional(),
  includeTransport: z.boolean().optional(),
  includeHotel: z.boolean().optional(),
  flightNumber: z.string().optional().nullable(),
}).refine(
  (data) =>
    !data.arrivalDate ||
    !data.departureDate ||
    isDepartureOnOrAfterArrival(data.arrivalDate, data.departureDate),
  { message: 'Departure date must be on or after arrival date' }
).refine(
  (data) =>
    !data.arrivalDate ||
    !data.departureDate ||
    isSameDayDepartureTimeValid({
      arrivalDate: data.arrivalDate,
      departureDate: data.departureDate,
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
    }),
  { message: 'Departure time must be after arrival time on the same day' }
);

export const updateStatusSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
});

const itineraryPlanDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  dateLabel: z.string().optional(),
  destinationId: z.string().optional(),
  morningActivityId: z.string().optional(),
  afternoonActivityId: z.string().optional(),
  eveningActivityId: z.string().optional(),
  notes: z.string().optional(),
});

export const saveItineraryPlanSchema = z.object({
  days: z.array(itineraryPlanDaySchema),
});

export const computeItineraryPlanDistancesSchema = z.object({
  days: z.array(itineraryPlanDaySchema),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
