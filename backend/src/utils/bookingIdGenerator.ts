import prisma from '../config/database';

export async function generateBookingId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VSL${year}`;

  const lastBooking = await prisma.booking.findFirst({
    where: { bookingId: { startsWith: prefix } },
    orderBy: { bookingId: 'desc' },
  });

  let nextNumber = 1;
  if (lastBooking) {
    const lastNumber = parseInt(lastBooking.bookingId.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}
