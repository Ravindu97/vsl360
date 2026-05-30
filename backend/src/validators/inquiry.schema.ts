import { z } from 'zod';
import { InquiryStatus } from '@prisma/client';

export const listInquiriesQuerySchema = z.object({
  status: z.nativeEnum(InquiryStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const updateInquirySchema = z
  .object({
    status: z.nativeEnum(InquiryStatus).optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    convertedBookingId: z.string().uuid().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' });

export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
