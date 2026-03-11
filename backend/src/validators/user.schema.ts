import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['SALES', 'RESERVATION', 'TRANSPORT', 'OPS_MANAGER']),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['SALES', 'RESERVATION', 'TRANSPORT', 'OPS_MANAGER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
