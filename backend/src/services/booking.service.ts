import { BookingStatus, Role } from '@prisma/client';
import prisma from '../config/database';
import { generateBookingId } from '../utils/bookingIdGenerator';
import { CreateBookingInput, UpdateBookingInput } from '../validators/booking.schema';

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
        status: BookingStatus.CLIENT_PROFILE_CREATED,
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
            toStatus: BookingStatus.CLIENT_PROFILE_CREATED,
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

  async findAll(userRole: Role, userId: string, status?: string) {
    const where: any = {};

    // Sales people only see their own bookings
    if (userRole === Role.SALES) {
      where.salesOwnerId = userId;
    }

    // Reservation/Transport see only confirmed+ bookings
    if (userRole === Role.RESERVATION || userRole === Role.TRANSPORT) {
      where.status = {
        notIn: [
          BookingStatus.INQUIRY_RECEIVED,
          BookingStatus.CLIENT_PROFILE_CREATED,
          BookingStatus.PAX_DETAILS_ADDED,
          BookingStatus.COSTING_COMPLETED,
        ],
      };
    }

    if (status) {
      where.status = status as BookingStatus;
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
    return booking;
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

  async updateStatus(id: string, status: BookingStatus, changedBy: string, notes?: string) {
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
    if (status === BookingStatus.RESERVATION_COMPLETED || status === BookingStatus.TRANSPORT_COMPLETED) {
      const refreshed = await prisma.booking.findUnique({ where: { id } });
      if (!refreshed) return updated;

      // Check if booking has been through both completions
      const history = await prisma.statusHistory.findMany({ where: { bookingId: id } });
      const hasReservationComplete = history.some((h) => h.toStatus === BookingStatus.RESERVATION_COMPLETED);
      const hasTransportComplete = history.some((h) => h.toStatus === BookingStatus.TRANSPORT_COMPLETED);

      if (hasReservationComplete && hasTransportComplete) {
        await prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.DOCUMENTS_READY,
            statusHistory: {
              create: {
                fromStatus: status,
                toStatus: BookingStatus.DOCUMENTS_READY,
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
