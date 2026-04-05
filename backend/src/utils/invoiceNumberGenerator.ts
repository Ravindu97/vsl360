import prisma from '../config/database';

export async function generateInvoiceNumber(bookingReference: string): Promise<string> {
  const normalizedBookingReference = bookingReference.trim().toUpperCase();
  const prefix = `INV-${normalizedBookingReference}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/-(\d+)$/);
    const lastNumber = match ? parseInt(match[1], 10) : 0;
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(2, '0')}`;
}
