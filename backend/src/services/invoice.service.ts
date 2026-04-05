import prisma from '../config/database';
import { generateInvoiceNumber } from '../utils/invoiceNumberGenerator';
import { CreateInvoiceInput } from '../validators/invoice.schema';

export class InvoiceService {
  private validateFinancials(totalAmount: number, advancePaid: number, balanceAmount: number) {
    if (advancePaid > totalAmount) {
      throw new Error('Advance paid cannot exceed total amount');
    }

    if (balanceAmount !== totalAmount - advancePaid) {
      throw new Error('Balance amount must equal total amount minus advance paid');
    }
  }

  async create(bookingId: string, data: CreateInvoiceInput) {
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) throw new Error('Invoice already exists for this booking');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { bookingId: true },
    });
    if (!booking) throw new Error('Booking not found');

    this.validateFinancials(data.totalAmount, data.advancePaid, data.balanceAmount);

    const invoiceNumber = await generateInvoiceNumber(booking.bookingId);

    return prisma.invoice.create({
      data: {
        bookingId,
        invoiceNumber,
        costPerPerson: data.costPerPerson,
        totalAmount: data.totalAmount,
        advancePaid: data.advancePaid,
        balanceAmount: data.balanceAmount,
        paymentNotes: data.paymentNotes,
        paymentInstructions: data.paymentInstructions,
        tourInclusions: data.tourInclusions,
      },
    });
  }

  async findByBookingId(bookingId: string) {
    return prisma.invoice.findUnique({ where: { bookingId } });
  }

  async update(bookingId: string, data: Partial<CreateInvoiceInput>) {
    const existing = await prisma.invoice.findUnique({ where: { bookingId } });
    if (!existing) throw new Error('Invoice not found');

    const totalAmount = data.totalAmount ?? existing.totalAmount;
    const advancePaid = data.advancePaid ?? existing.advancePaid;
    const balanceAmount = data.balanceAmount ?? existing.balanceAmount;

    this.validateFinancials(totalAmount, advancePaid, balanceAmount);

    return prisma.invoice.update({
      where: { bookingId },
      data: {
        ...(data.costPerPerson !== undefined && { costPerPerson: data.costPerPerson }),
        ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
        ...(data.advancePaid !== undefined && { advancePaid: data.advancePaid }),
        ...(data.balanceAmount !== undefined && { balanceAmount: data.balanceAmount }),
        ...(data.paymentNotes !== undefined && { paymentNotes: data.paymentNotes }),
        ...(data.paymentInstructions !== undefined && { paymentInstructions: data.paymentInstructions }),
        ...(data.tourInclusions !== undefined && { tourInclusions: data.tourInclusions }),
      },
    });
  }
}

export const invoiceService = new InvoiceService();
