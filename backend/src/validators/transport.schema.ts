import { z } from 'zod';

export const createTransportSchema = z.object({
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleNotes: z.string().optional(),
  babySeatRequired: z.boolean().default(false),
  driverName: z.string().optional(),
  driverLanguage: z.string().min(1, 'Driver language is required'),
  arrivalPickupLocation: z.string().optional(),
  arrivalPickupTime: z.string().optional(),
  arrivalPickupNotes: z.string().optional(),
  departureDropLocation: z.string().optional(),
  departureDropTime: z.string().optional(),
  departureDropNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateTransportSchema = createTransportSchema.partial();

export const createDayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  description: z.string().min(1),
  pickupTime: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropLocation: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDayPlanSchema = createDayPlanSchema.partial();

export type CreateTransportInput = z.infer<typeof createTransportSchema>;
export type CreateDayPlanInput = z.infer<typeof createDayPlanSchema>;
