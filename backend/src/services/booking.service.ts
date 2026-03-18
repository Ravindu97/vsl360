import prisma from '../config/database';
import { generateBookingId } from '../utils/bookingIdGenerator';
import { CreateBookingInput, UpdateBookingInput } from '../validators/booking.schema';

type UserRole = 'SALES' | 'RESERVATION' | 'TRANSPORT' | 'OPS_MANAGER';
type BookingStatusValue =
  | 'INQUIRY_RECEIVED'
  | 'CLIENT_PROFILE_CREATED'
  | 'PAX_DETAILS_ADDED'
  | 'COSTING_COMPLETED'
  | 'SALES_CONFIRMED'
  | 'RESERVATION_PENDING'
  | 'RESERVATION_COMPLETED'
  | 'TRANSPORT_PENDING'
  | 'TRANSPORT_COMPLETED'
  | 'DOCUMENTS_READY'
  | 'OPS_APPROVED'
  | 'COMPLETED'
  | 'CANCELLED';

const BOOKING_STATUS: Record<BookingStatusValue, BookingStatusValue> = {
  INQUIRY_RECEIVED: 'INQUIRY_RECEIVED',
  CLIENT_PROFILE_CREATED: 'CLIENT_PROFILE_CREATED',
  PAX_DETAILS_ADDED: 'PAX_DETAILS_ADDED',
  COSTING_COMPLETED: 'COSTING_COMPLETED',
  SALES_CONFIRMED: 'SALES_CONFIRMED',
  RESERVATION_PENDING: 'RESERVATION_PENDING',
  RESERVATION_COMPLETED: 'RESERVATION_COMPLETED',
  TRANSPORT_PENDING: 'TRANSPORT_PENDING',
  TRANSPORT_COMPLETED: 'TRANSPORT_COMPLETED',
  DOCUMENTS_READY: 'DOCUMENTS_READY',
  OPS_APPROVED: 'OPS_APPROVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export class BookingService {
  async create(data: CreateBookingInput, salesOwnerId: string) {
    const bookingId = await generateBookingId();

    const booking = await prisma.booking.create({
      data: {
        bookingId,
        numberOfDays: data.numberOfDays,
        tourMonth: data.tourMonth,
        arrivalDate: new Date(data.arrivalDate),
        arrivalTime: data.arrivalTime,
        departureDate: new Date(data.departureDate),
        departureTime: data.departureTime,
        additionalActivities: data.additionalActivities,
        specialCelebrations: data.specialCelebrations,
        generalNotes: data.generalNotes,
        salesOwnerId,
        status: BOOKING_STATUS.CLIENT_PROFILE_CREATED,
        client: {
          create: {
            name: data.client.name,
            citizenship: data.client.citizenship,
            email: data.client.email,
            contactNumber: data.client.contactNumber,
          },
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: BOOKING_STATUS.CLIENT_PROFILE_CREATED,
            changedBy: salesOwnerId,
            notes: 'Booking created',
          },
        },
      },
      include: {
        client: true,
        salesOwner: { select: { id: true, name: true, email: true } },
      },
    });

    return booking;
  }

  async findAll(userRole: UserRole, userId: string, status?: string) {
    const where: any = {};

    // Sales people only see their own bookings
    if (userRole === 'SALES') {
      where.salesOwnerId = userId;
    }

    // Reservation/Transport see only confirmed+ bookings
    if (userRole === 'RESERVATION' || userRole === 'TRANSPORT') {
      where.status = {
        notIn: [
          BOOKING_STATUS.INQUIRY_RECEIVED,
          BOOKING_STATUS.CLIENT_PROFILE_CREATED,
          BOOKING_STATUS.PAX_DETAILS_ADDED,
          BOOKING_STATUS.COSTING_COMPLETED,
        ],
      };
    }

    if (status) {
      where.status = status as BookingStatusValue;
    }

    return prisma.booking.findMany({
      where,
      include: {
        client: true,
        salesOwner: { select: { id: true, name: true, email: true } },
        _count: { select: { paxList: true, hotelPlan: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        paxList: { orderBy: { createdAt: 'asc' } },
        hotelPlan: { orderBy: { nightNumber: 'asc' } },
        transportPlan: {
          include: { dayPlans: { orderBy: { dayNumber: 'asc' } } },
        },
        invoice: true,
        attachments: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        salesOwner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) throw new Error('Booking not found');

    const changedByIds = [...new Set(
      booking.statusHistory
        .map((entry: { changedBy: string }) => entry.changedBy)
        .filter((changedBy: string) => changedBy && changedBy !== 'SYSTEM')
    )];

    const users = changedByIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: changedByIds } },
          select: { id: true, name: true },
        })
      : [];

    const userNames = new Map(users.map((user: { id: string; name: string }) => [user.id, user.name]));

    return {
      ...booking,
      statusHistory: booking.statusHistory.map((entry: { changedBy: string }) => ({
        ...entry,
        changedByName: entry.changedBy === 'SYSTEM' ? 'System' : (userNames.get(entry.changedBy) ?? entry.changedBy),
      })),
    };
  }

  async update(id: string, data: UpdateBookingInput) {
    return prisma.booking.update({
      where: { id },
      data: {
        ...(data.numberOfDays !== undefined && { numberOfDays: data.numberOfDays }),
        ...(data.tourMonth && { tourMonth: data.tourMonth }),
        ...(data.arrivalDate && { arrivalDate: new Date(data.arrivalDate) }),
        ...(data.arrivalTime && { arrivalTime: data.arrivalTime }),
        ...(data.departureDate && { departureDate: new Date(data.departureDate) }),
        ...(data.departureTime && { departureTime: data.departureTime }),
        ...(data.additionalActivities !== undefined && { additionalActivities: data.additionalActivities }),
        ...(data.specialCelebrations !== undefined && { specialCelebrations: data.specialCelebrations }),
        ...(data.generalNotes !== undefined && { generalNotes: data.generalNotes }),
      },
      include: {
        client: true,
        salesOwner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateStatus(id: string, status: BookingStatusValue, changedBy: string, notes?: string) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new Error('Booking not found');

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: status,
            changedBy,
            notes,
          },
        },
      },
    });

    // Auto-check if both departments are done
    if (status === BOOKING_STATUS.RESERVATION_COMPLETED || status === BOOKING_STATUS.TRANSPORT_COMPLETED) {
      const refreshed = await prisma.booking.findUnique({ where: { id } });
      if (!refreshed) return updated;

      // Check if booking has been through both completions
      const history = await prisma.statusHistory.findMany({ where: { bookingId: id } });
      const hasReservationComplete = history.some((h: { toStatus: string }) => h.toStatus === BOOKING_STATUS.RESERVATION_COMPLETED);
      const hasTransportComplete = history.some((h: { toStatus: string }) => h.toStatus === BOOKING_STATUS.TRANSPORT_COMPLETED);

      if (hasReservationComplete && hasTransportComplete) {
        await prisma.booking.update({
          where: { id },
          data: {
            status: BOOKING_STATUS.DOCUMENTS_READY,
            statusHistory: {
              create: {
                fromStatus: status,
                toStatus: BOOKING_STATUS.DOCUMENTS_READY,
                changedBy: 'SYSTEM',
                notes: 'Both departments completed — documents ready for generation',
              },
            },
          },
        });
      }
    }

    return updated;
  }

  async delete(id: string) {
    return prisma.booking.delete({ where: { id } });
  }
}

export const bookingService = new BookingService();
