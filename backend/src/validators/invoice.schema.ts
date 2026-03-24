import { z } from 'zod';

const invoiceBaseSchema = z.object({
  costPerPerson: z.number().positive(),
  totalAmount: z.number().positive(),
  advancePaid: z.number().min(0).default(0),
  balanceAmount: z.number().min(0),
  paymentNotes: z.string().optional(),
  paymentInstructions: z.string().optional(),
  tourInclusions: z.string().optional(),
});

export const createInvoiceSchema = invoiceBaseSchema.superRefine((data, ctx) => {
  if (data.advancePaid > data.totalAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['advancePaid'],
      message: 'Advance paid cannot exceed total amount',
    });
  }

  if (data.balanceAmount !== data.totalAmount - data.advancePaid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['balanceAmount'],
      message: 'Balance amount must equal total amount minus advance paid',
    });
  }
});

export const updateInvoiceSchema = invoiceBaseSchema.partial();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
