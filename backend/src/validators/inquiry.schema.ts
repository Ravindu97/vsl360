import { z } from 'zod';

export const createCustomItineraryInquirySchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim().nullable().optional(),
    adults: z.number().int().min(1),
    children: z.number().int().min(0).default(0),
    travelStyles: z.array(z.string().trim().min(1)).min(1),
    accommodation: z.string().trim().min(1),
    arrivalDate: z.string().trim().nullable().optional(),
    departureDate: z.string().trim().nullable().optional(),
    durationDays: z.number().int().positive().nullable().optional(),
    specialRequests: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      const hasDates = Boolean(data.arrivalDate && data.departureDate);
      const hasDuration = data.durationDays != null && data.durationDays > 0;
      return hasDates || hasDuration;
    },
    { message: 'Provide arrivalDate and departureDate, or durationDays' },
  );

export type CreateCustomItineraryInquiryInput = z.infer<typeof createCustomItineraryInquirySchema>;

export const updateCustomItineraryInquirySchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUOTED']).optional(),
  adminNotes: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
});

export type UpdateCustomItineraryInquiryInput = z.infer<typeof updateCustomItineraryInquirySchema>;
