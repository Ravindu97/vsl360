import { InquirySource, InquiryStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

export type InquiryListFilters = {
  status?: InquiryStatus;
  search?: string;
};

export class InquiryService {
  async ingestWhatsappText(input: {
    waMessageId: string;
    waPhoneNumberId?: string;
    fromPhone: string;
    waProfileName?: string | null;
    messageBody: string;
    rawPayload: Prisma.InputJsonValue;
  }) {
    const existing = await prisma.inquiry.findUnique({
      where: { waMessageId: input.waMessageId },
    });
    if (existing) {
      return existing;
    }

    try {
      return await prisma.inquiry.create({
        data: {
          source: InquirySource.WHATSAPP,
          status: InquiryStatus.NEW,
          waMessageId: input.waMessageId,
          waPhoneNumberId: input.waPhoneNumberId ?? null,
          fromPhone: input.fromPhone,
          waProfileName: input.waProfileName ?? null,
          messageBody: input.messageBody,
          rawPayload: input.rawPayload,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await prisma.inquiry.findUnique({
          where: { waMessageId: input.waMessageId },
        });
        if (again) return again;
      }
      throw e;
    }
  }

  async findAll(filters: InquiryListFilters, page = 1, pageSize = 10) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, Math.min(pageSize, 100));
    const where: Prisma.InquiryWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { fromPhone: { contains: term, mode: 'insensitive' } },
        { waProfileName: { contains: term, mode: 'insensitive' } },
        { messageBody: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.inquiry.count({ where }),
      prisma.inquiry.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          convertedBooking: { select: { id: true, bookingId: true, status: true } },
        },
      }),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize) || 1,
    };
  }

  async findById(id: string) {
    return prisma.inquiry.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        convertedBooking: { select: { id: true, bookingId: true, status: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      status?: InquiryStatus;
      assignedUserId?: string | null;
      convertedBookingId?: string | null;
    }
  ) {
    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    const include = {
      assignedTo: { select: { id: true, name: true, email: true } as const },
      convertedBooking: { select: { id: true, bookingId: true, status: true } as const },
    };

    if (inquiry.status === InquiryStatus.CONVERTED) {
      if (data.status != null && data.status !== InquiryStatus.CONVERTED) {
        throw new Error('Cannot change status of a converted inquiry');
      }
      if (
        data.convertedBookingId != null &&
        data.convertedBookingId !== inquiry.convertedBookingId
      ) {
        throw new Error('Inquiry is already linked to a booking');
      }
      if (data.assignedUserId === undefined) {
        return prisma.inquiry.findUniqueOrThrow({ where: { id }, include });
      }
      return prisma.inquiry.update({
        where: { id },
        data: { assignedUserId: data.assignedUserId },
        include,
      });
    }

    const patch: Prisma.InquiryUncheckedUpdateInput = {};

    if (data.assignedUserId !== undefined) {
      patch.assignedUserId = data.assignedUserId;
    }

    if (data.convertedBookingId !== undefined && data.convertedBookingId !== null) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.convertedBookingId },
        select: { id: true },
      });
      if (!booking) {
        throw new Error('Booking not found');
      }
      patch.convertedBookingId = data.convertedBookingId;
      patch.status = InquiryStatus.CONVERTED;
    }

    if (data.status !== undefined) {
      if (data.status === InquiryStatus.CONVERTED) {
        const bookingId =
          typeof patch.convertedBookingId === 'string'
            ? patch.convertedBookingId
            : inquiry.convertedBookingId;
        if (!bookingId) {
          throw new Error('convertedBookingId is required when marking as CONVERTED');
        }
        patch.status = InquiryStatus.CONVERTED;
        if (typeof patch.convertedBookingId !== 'string') {
          patch.convertedBookingId = bookingId;
        }
      } else if (patch.status !== InquiryStatus.CONVERTED) {
        patch.status = data.status;
      }
    }

    if (Object.keys(patch).length === 0) {
      return prisma.inquiry.findUniqueOrThrow({ where: { id }, include });
    }

    return prisma.inquiry.update({
      where: { id },
      data: patch,
      include,
    });
  }
}

export const inquiryService = new InquiryService();
