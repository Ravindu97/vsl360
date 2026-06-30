import { Prisma, QuoteStatus } from '@prisma/client';
import prisma from '../config/database';
import {
  accommodationLabel,
  formatDurationSummary,
  formatGuestSummary,
  TIMELINE_STAGE_LABELS,
  timelineLabelForStatus,
  travelStyleLabel,
} from '../utils/inquiryLabels';
import { generateUniquePublicRef } from '../utils/publicRef';
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

const timelineInclude = {
  timelineEvents: { orderBy: { createdAt: 'asc' as const } },
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
          { publicRef: { contains: term, mode: 'insensitive' } },
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
    const record = await prisma.customItineraryRequest.findUnique({
      where: { id },
      include: timelineInclude,
    });
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

    const statusChanging = data.status !== undefined && data.status !== existing.status;
    const timelineLabel = statusChanging && data.status ? timelineLabelForStatus(data.status) : null;
    const timelineStage = statusChanging && data.status && data.status !== 'NEW' ? data.status : null;

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.customItineraryRequest.update({
        where: { id },
        data: {
          ...(data.status !== undefined
            ? {
                status: data.status,
                ...(data.status === 'CONTACTED' && !existing.contactedAt
                  ? { contactedAt: new Date() }
                  : {}),
              }
            : {}),
          ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
          ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
        },
      });

      if (timelineStage && timelineLabel) {
        await tx.inquiryTimelineEvent.create({
          data: {
            inquiryId: id,
            stage: timelineStage,
            label: timelineLabel,
          },
        });
      }

      return record;
    });

    return withSla(
      await prisma.customItineraryRequest.findUniqueOrThrow({
        where: { id: updated.id },
        include: timelineInclude,
      }),
    );
  }

  async create(data: CreateCustomItineraryInquiryInput) {
    const hasDates = Boolean(data.arrivalDate && data.departureDate);
    const publicRef = await generateUniquePublicRef();

    const created = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.customItineraryRequest.create({
        data: {
          publicRef,
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

      await tx.inquiryTimelineEvent.create({
        data: {
          inquiryId: inquiry.id,
          stage: 'RECEIVED',
          label: TIMELINE_STAGE_LABELS.RECEIVED,
          createdAt: inquiry.createdAt,
        },
      });

      return inquiry;
    });

    return { id: created.id, publicRef: created.publicRef };
  }

  async trackByReference(reference: string, email: string) {
    const normalizedEmail = normalizeEmail(email);
    const trimmedRef = reference.trim();

    const inquiry =
      (await prisma.customItineraryRequest.findUnique({
        where: { publicRef: trimmedRef },
        include: timelineInclude,
      })) ??
      (await prisma.customItineraryRequest.findUnique({
        where: { id: trimmedRef },
        include: timelineInclude,
      }));

    if (!inquiry || normalizeEmail(inquiry.email) !== normalizedEmail) {
      return null;
    }

    const dueAt = new Date(inquiry.createdAt.getTime() + SLA_MS);
    const isOverdue = inquiry.status === 'NEW' && Date.now() > dueAt.getTime();

    return {
      reference: inquiry.publicRef,
      type: 'CUSTOM_ITINERARY' as const,
      status: inquiry.status,
      submittedAt: inquiry.createdAt.toISOString(),
      timeline: inquiry.timelineEvents.map((event) => ({
        stage: event.stage,
        label: event.label,
        at: event.createdAt.toISOString(),
      })),
      summary: {
        guests: formatGuestSummary(inquiry.adults, inquiry.children),
        duration: formatDurationSummary(
          inquiry.arrivalDate,
          inquiry.departureDate,
          inquiry.durationDays,
        ),
        travelStyles: inquiry.travelStyles.map(travelStyleLabel),
        accommodation: accommodationLabel(inquiry.accommodation),
      },
      sla: {
        promisedHours: SLA_HOURS,
        dueAt: dueAt.toISOString(),
        isOverdue,
      },
    };
  }
}

export const customItineraryInquiryService = new CustomItineraryInquiryService();
