import { z } from 'zod';

export const createBookingSchema = z.object({
  numberOfDays: z.number().int().positive(),
  tourMonth: z.string().min(1),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  arrivalTime: z.string().min(1),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  departureTime: z.string().min(1),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
  client: z.object({
    name: z.string().min(1, 'Guest name is required'),
    citizenship: z.string().min(1, 'Citizenship is required'),
    email: z.string().email('Invalid email'),
    contactNumber: z.string().min(1, 'Contact number is required'),
  }),
});

export const updateBookingSchema = z.object({
  numberOfDays: z.number().int().positive().optional(),
  tourMonth: z.string().min(1).optional(),
  arrivalDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  arrivalTime: z.string().min(1).optional(),
  departureDate: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  departureTime: z.string().min(1).optional(),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
