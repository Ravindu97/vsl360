import { z } from 'zod';

export const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  citizenship: z.string().min(1).optional(),
  languagePreference: z.string().min(1).optional(),
  email: z.string().email().optional(),
  contactNumber: z.string().min(1).optional(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
