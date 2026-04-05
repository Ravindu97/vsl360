import { z } from 'zod';

const inferPaxType = (age: number): 'INFANT' | 'CHILD' | 'ADULT' => {
  if (age <= 6) return 'INFANT';
  if (age <= 12) return 'CHILD';
  return 'ADULT';
};

export const createPaxSchema = z.object({
  name: z.string().min(1, 'Passenger name is required'),
  relationship: z.string().optional(),
  type: z.enum(['ADULT', 'CHILD', 'INFANT']).optional(),
  age: z.number().int().min(0, 'Age is required').max(120, 'Please provide a valid age'),
}).superRefine((data, ctx) => {
  if (data.type) {
    const expectedType = inferPaxType(data.age);
    if (data.type !== expectedType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: `Passenger type must be ${expectedType} for age ${data.age}`,
      });
    }
  }
});

export const updatePaxSchema = z.object({
  name: z.string().min(1, 'Passenger name is required').optional(),
  relationship: z.string().optional(),
  type: z.enum(['ADULT', 'CHILD', 'INFANT']).optional(),
  age: z.number().int().min(0, 'Age must be 0 or more').max(120, 'Please provide a valid age').optional(),
}).superRefine((data, ctx) => {
  if (data.type && data.age === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['age'],
      message: 'Age is required when updating passenger type',
    });
    return;
  }

  if (data.type && data.age !== undefined) {
    const expectedType = inferPaxType(data.age);
    if (data.type !== expectedType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: `Passenger type must be ${expectedType} for age ${data.age}`,
      });
    }
  }
});

export type CreatePaxInput = z.infer<typeof createPaxSchema>;
