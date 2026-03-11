import { z } from 'zod';

export const createInvoiceSchema = z.object({
  costPerPerson: z.number().positive(),
  totalAmount: z.number().positive(),
  advancePaid: z.number().min(0).default(0),
  balanceAmount: z.number().min(0),
  paymentNotes: z.string().optional(),
  paymentInstructions: z.string().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
