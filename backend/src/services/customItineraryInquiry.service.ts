import { Prisma, QuoteStatus } from '@prisma/client';
import prisma from '../config/database';
import {
  CreateCustomItineraryInquiryInput,
  UpdateCustomItineraryInquiryInput,
} from '../validators/inquiry.schema';

export const SLA_HOURS = 12;
const SLA_MS = SLA_HOURS * 60 * 60 * 1000;

export type InquirySlaStatus = 'none' | 'due' | 'overdue';

export type CustomItineraryInquiryFilters = {
  status?: string;
  search?: string;
  submittedFrom?: string;
  submittedTo?: string;
  overdueOnly?: boolean;
};

const STATUS_ORDER: Record<QuoteStatus, number> = {
  NEW: 0,
  CONTACTED: 1,
  QUOTED: 2,
};

export function computeSlaStatus(
  status: QuoteStatus,
  createdAt: Date,
  now = Date.now(),
): InquirySlaStatus {
  if (status !== 'NEW') return 'none';
  return now - createdAt.getTime() > SLA_MS ? 'overdue' : 'due';
}

function withSla<T extends { status: QuoteStatus; createdAt: Date }>(record: T) {
  return {
    ...record,
    slaStatus: computeSlaStatus(record.status, record.createdAt),
  };
}

function isValidStatusTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return STATUS_ORDER[to] >= STATUS_ORDER[from];
}

export class CustomItineraryInquiryService {
  private buildWhere(filters: CustomItineraryInquiryFilters): Prisma.CustomItineraryRequestWhereInput {
    const conditions: Prisma.CustomItineraryRequestWhereInput[] = [];

    if (filters.status) {
      conditions.push({ status: filters.status as QuoteStatus });
    }

    if (filters.search) {
      const term = filters.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.submittedFrom) {
      conditions.push({ createdAt: { gte: new Date(filters.submittedFrom) } });
    }

    if (filters.submittedTo) {
      const end = new Date(filters.submittedTo);
      end.setHours(23, 59, 59, 999);
      conditions.push({ createdAt: { lte: end } });
    }

    if (filters.overdueOnly) {
      conditions.push({
        status: 'NEW',
        createdAt: { lt: new Date(Date.now() - SLA_MS) },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  async findAll(filters: CustomItineraryInquiryFilters, page = 1, pageSize = 10) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, Math.min(pageSize, 100));
    const where = this.buildWhere(filters);

    const [items, total] = await Promise.all([
      prisma.customItineraryRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      prisma.customItineraryRequest.count({ where }),
    ]);

    return {
      items: items.map(withSla),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  async getStats() {
    const overdueCutoff = new Date(Date.now() - SLA_MS);

    const [newCount, overdueCount] = await Promise.all([
      prisma.customItineraryRequest.count({ where: { status: 'NEW' } }),
      prisma.customItineraryRequest.count({
        where: {
          status: 'NEW',
          createdAt: { lt: overdueCutoff },
        },
      }),
    ]);

    return { newCount, overdueCount };
  }

  async findById(id: string) {
    const record = await prisma.customItineraryRequest.findUnique({ where: { id } });
    if (!record) {
      throw new Error('Inquiry not found');
    }
    return withSla(record);
  }

  async update(id: string, data: UpdateCustomItineraryInquiryInput) {
    const existing = await prisma.customItineraryRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Inquiry not found');
    }

    if (data.status && !isValidStatusTransition(existing.status, data.status)) {
      throw new Error(`Invalid status transition from ${existing.status} to ${data.status}`);
    }

    const updateData: Prisma.CustomItineraryRequestUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'CONTACTED' && !existing.contactedAt) {
        updateData.contactedAt = new Date();
      }
    }

    if (data.adminNotes !== undefined) {
      updateData.adminNotes = data.adminNotes;
    }

    if (data.assignedTo !== undefined) {
      updateData.assignedTo = data.assignedTo;
    }

    const updated = await prisma.customItineraryRequest.update({
      where: { id },
      data: updateData,
    });

    return withSla(updated);
  }

  async create(data: CreateCustomItineraryInquiryInput) {
    const hasDates = Boolean(data.arrivalDate && data.departureDate);

    const created = await prisma.customItineraryRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone?.trim() || null,
        adults: data.adults,
        children: data.children,
        travelStyles: data.travelStyles,
        accommodation: data.accommodation,
        arrivalDate: hasDates ? data.arrivalDate! : null,
        departureDate: hasDates ? data.departureDate! : null,
        durationDays: hasDates ? null : data.durationDays ?? null,
        specialRequests: data.specialRequests?.trim() || null,
        status: 'NEW',
      },
    });

    return { id: created.id };
  }
}

export const customItineraryInquiryService = new CustomItineraryInquiryService();
