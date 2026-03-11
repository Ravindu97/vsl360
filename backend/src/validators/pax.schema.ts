import { z } from 'zod';

export const createPaxSchema = z.object({
  name: z.string().min(1, 'Passenger name is required'),
  relationship: z.string().optional(),
  type: z.enum(['ADULT', 'CHILD', 'INFANT']),
  age: z.number().int().positive().optional(),
});

export const updatePaxSchema = createPaxSchema.partial();

export type CreatePaxInput = z.infer<typeof createPaxSchema>;
