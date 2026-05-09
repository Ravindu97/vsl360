import { z } from 'zod';

export const generateInvoiceDocumentSchema = z
  .object({
    billedToType: z.enum(['CLIENT', 'PAX']),
    billedToPaxId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.billedToType === 'PAX' && !data.billedToPaxId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billedToPaxId'],
        message: 'billedToPaxId is required when billedToType is PAX',
      });
    }
  });

export type GenerateInvoiceDocumentInput = z.infer<typeof generateInvoiceDocumentSchema>;
