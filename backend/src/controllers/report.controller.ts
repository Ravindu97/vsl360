import { Response } from 'express';
import { BookingStatus, CurrencyCode } from '@prisma/client';
import prisma from '../config/database';
import { fxRateService } from '../services/fxRate.service';
import { AuthRequest } from '../types';

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export class ReportController {
  async dashboard(_req: AuthRequest, res: Response): Promise<void> {
    const [totalBookings, statusCounts, recentBookings] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          salesOwner: { select: { id: true, name: true } },
        },
      }),
    ]);

    const invoices = await prisma.invoice.findMany({
      select: {
        totalAmount: true,
        advancePaid: true,
        balanceAmount: true,
        booking: {
          select: {
            client: {
              select: {
                preferredCurrency: true,
              },
            },
          },
        },
      },
    });
    const rates = await fxRateService.getInrRates();
    const revenue = invoices.reduce(
      (acc, invoice) => {
        const currency = invoice.booking.client?.preferredCurrency ?? CurrencyCode.USD;
        const convert = (amount: unknown) => {
          if (currency === CurrencyCode.EUR) return toFiniteNumber(amount, 0) * rates.eurToInr;
          if (currency === CurrencyCode.USD) return toFiniteNumber(amount, 0) * rates.usdToInr;
          return toFiniteNumber(amount, 0);
        };
        acc.total += convert(invoice.totalAmount);
        acc.collected += convert(invoice.advancePaid);
        acc.pending += convert(invoice.balanceAmount);
        return acc;
      },
      { total: 0, collected: 0, pending: 0 }
    );

    res.json({
      totalBookings,
      statusCounts: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.status }),
        {} as Record<string, number>
      ),
      revenue: {
        total: Number(revenue.total.toFixed(2)),
        collected: Number(revenue.collected.toFixed(2)),
        pending: Number(revenue.pending.toFixed(2)),
        currency: CurrencyCode.INR,
        conversionMeta: {
          source: rates.source,
          asOf: rates.asOf,
          usdToInr: Number(rates.usdToInr.toFixed(6)),
          eurToInr: Number(rates.eurToInr.toFixed(6)),
        },
      },
      recentBookings,
    });
  }

  async bookings(req: AuthRequest, res: Response): Promise<void> {
    const { status, from, to, salesPerson } = req.query;

    const where: any = {};
    if (status) where.status = status as BookingStatus;
    if (salesPerson) where.salesOwnerId = salesPerson;
    if (from || to) {
      where.arrivalDate = {};
      if (from) where.arrivalDate.gte = new Date(from as string);
      if (to) where.arrivalDate.lte = new Date(to as string);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: true,
        invoice: true,
        salesOwner: { select: { id: true, name: true } },
        _count: { select: { paxList: true } },
      },
      orderBy: { arrivalDate: 'asc' },
    });

    res.json(bookings);
  }
}

export const reportController = new ReportController();
