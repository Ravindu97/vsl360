import { z } from 'zod';

export const createHotelSchema = z.object({
  nightNumber: z.number().int().positive(),
  location: z
    .string()
    .max(200)
    .nullish()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === '' ? null : t;
    }),
  hotelName: z.string().min(1, 'Hotel name is required'),
  roomCategory: z.string().min(1, 'Room category is required'),
  numberOfRooms: z.number().int().positive(),
  roomPreference: z.string().optional(),
  mealPlan: z.string().min(1, 'Meal plan is required'),
  mealPreference: z.string().optional(),
  mobilityNotes: z.string().optional(),
  confirmationStatus: z.enum(['PENDING', 'CONFIRMED']).optional(),
  reservationNotes: z.string().optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

export type CreateHotelInput = z.infer<typeof createHotelSchema>;
