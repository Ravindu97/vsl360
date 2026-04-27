import { z } from 'zod';

export const createBookingSchema = z.object({
  numberOfDays: z.number().int().positive(),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  arrivalTime: z.string().min(1),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  departureTime: z.string().min(1),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  flightNumber: z.string().optional(),
  client: z.object({
    name: z.string().min(1, 'Guest name is required'),
    citizenship: z.string().min(1, 'Citizenship is required'),
    languagePreference: z.string().min(1, 'Language preference is required').default('English'),
    preferredCurrency: z.enum(['EUR', 'USD', 'INR']).default('USD'),
    email: z.string().email('Invalid email'),
    contactNumber: z.string().min(1, 'Contact number is required'),
    passportNumber: z.string().optional(),
  }),
});

export const updateBookingSchema = z.object({
  numberOfDays: z.number().int().positive().optional(),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  arrivalTime: z.string().min(1).optional(),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  departureTime: z.string().min(1).optional(),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  flightNumber: z.string().optional().nullable(),
});

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
