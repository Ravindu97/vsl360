import prisma from '../config/database';

export async function generateBookingId(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `VSL${yy}${mm}${dd}`;

  const lastBooking = await prisma.booking.findFirst({
    where: { bookingId: { startsWith: datePrefix } },
    orderBy: { bookingId: 'desc' },
  });

  let nextNumber = 1;
  if (lastBooking) {
    const seq = lastBooking.bookingId.split('-')[1];
    nextNumber = (parseInt(seq, 10) || 0) + 1;
  }

  return `${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
}
