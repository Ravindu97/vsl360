import { Response } from 'express';
import { BookingStatus } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../types';

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

    const revenue = await prisma.invoice.aggregate({
      _sum: { totalAmount: true, advancePaid: true, balanceAmount: true },
    });

    res.json({
      totalBookings,
      statusCounts: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.status }),
        {} as Record<string, number>
      ),
      revenue: {
        total: revenue._sum.totalAmount || 0,
        collected: revenue._sum.advancePaid || 0,
        pending: revenue._sum.balanceAmount || 0,
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
