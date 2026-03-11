import { Request, Response } from 'express';
import prisma from '../config/database';

export class TransportController {
  async findByBookingId(req: Request, res: Response): Promise<void> {
    const transport = await prisma.transportPlan.findUnique({
      where: { bookingId: req.params.id },
      include: { dayPlans: { orderBy: { dayNumber: 'asc' } } },
    });
    if (!transport) {
      res.status(404).json({ error: 'Transport plan not found' });
      return;
    }
    res.json(transport);
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const transport = await prisma.transportPlan.create({
        data: {
          bookingId: req.params.id,
          ...req.body,
        },
        include: { dayPlans: true },
      });
      res.status(201).json(transport);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Transport plan already exists for this booking' });
        return;
      }
      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const transport = await prisma.transportPlan.update({
        where: { bookingId: req.params.id },
        data: req.body,
        include: { dayPlans: { orderBy: { dayNumber: 'asc' } } },
      });
      res.json(transport);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Transport plan not found' });
        return;
      }
      throw error;
    }
  }

  async createDayPlan(req: Request, res: Response): Promise<void> {
    const transport = await prisma.transportPlan.findUnique({
      where: { bookingId: req.params.id },
    });
    if (!transport) {
      res.status(404).json({ error: 'Transport plan not found' });
      return;
    }

    const dayPlan = await prisma.transportDayPlan.create({
      data: {
        transportPlanId: transport.id,
        ...req.body,
      },
    });
    res.status(201).json(dayPlan);
  }

  async updateDayPlan(req: Request, res: Response): Promise<void> {
    try {
      const dayPlan = await prisma.transportDayPlan.update({
        where: { id: req.params.dayId },
        data: req.body,
      });
      res.json(dayPlan);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Day plan not found' });
        return;
      }
      throw error;
    }
  }

  async deleteDayPlan(req: Request, res: Response): Promise<void> {
    try {
      await prisma.transportDayPlan.delete({ where: { id: req.params.dayId } });
      res.json({ message: 'Day plan removed' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Day plan not found' });
        return;
      }
      throw error;
    }
  }
}

export const transportController = new TransportController();
